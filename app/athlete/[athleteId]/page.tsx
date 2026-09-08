"use client";

import React, { useEffect, useState } from "react";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import Image from "next/image";
import useMediaQuery from 'react-responsive';
import { notFound } from "next/navigation";

type Performance = {
  performance_id: number;
  athlete_id: number;
  event_id: number;
  mark: number | string;
  season: string;              // 'i' | 'o'
  date: string;
  result_link: string | null;
  ranking: number | null;
  is_personal_best: boolean;
  is_collegiate_best: boolean;
  is_overall_best: boolean;
  is_season_best: boolean;
  Events: { event_name: string };
};

type Others = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
};

type Athlete = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  year: number;
  graduation_year: number | null;
  sex: string | null;
  nickname: string | null;
  bio: string | null;
  image_path: string | null;
  college_progression: Performance[];
  other_athletes: Others[];
  awards: string[];
};

// seconds -> "m:ss.hh"; leaves field marks / points (no decimal, or < 60) as-is
const numConvert = (value: number | string | null) => {
  if (value === "-" || value === null || value === undefined) {
    return "-";
  }
  const str = String(value);
  if (!str.includes(".")) {
    return str;
  }
  let seconds = Number(str);
  if (seconds > 60) {
    let minutes = 0;
    while (seconds > 60) {
      minutes++;
      seconds -= 60;
    }
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  }
  return seconds.toFixed(2).padStart(5, "0");
};

const groupDataByEventAndSeason = (data: Performance[]) => {
  return data.reduce((acc: { [key: string]: Performance[] }, item) => {
    const key = `${item.event_id}-${item.season}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...item, mark: Number(item.mark) });
    return acc;
  }, {});
};

const sortDataByDate = (groupedData: { [key: string]: Performance[] }) => {
  Object.keys(groupedData).forEach((key) => {
    groupedData[key].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });
  return groupedData;
};

const getMinMaxWithPadding = (data: Performance[]) => {
  const marks = data.map((d) => Number(d.mark));
  const min = Math.min(...marks);
  const max = Math.max(...marks);
  const range = max - min;
  const padding = range * 0.05;
  const dynamicMin = range === 0 ? min - 1 : min - padding;
  const dynamicMax = range === 0 ? max + 1 : max + padding;
  return [dynamicMin, dynamicMax];
};

const EventCharts: React.FC<{ data: Performance[] }> = ({ data }) => {
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const sortedGroupedData = sortDataByDate(groupDataByEventAndSeason(data));

  return (
    <div>
      {Object.entries(sortedGroupedData).map(([key, chartData]) => {
        if (chartData.length <= 1) return null;

        const season = key.split("-")[1];
        const [minMark, maxMark] = getMinMaxWithPadding(chartData);
        return (
          <div key={key} style={{ marginBottom: "40px", marginLeft: "30px" }}>
            <h3>
              Event: {chartData[0].Events.event_name}, Season:{" "}
              {season === "i" ? "Indoor" : "Outdoor"}
            </h3>
            <ResponsiveContainer width={isSmallScreen ? "100%" : "75%"} height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => moment(date).format("MM/DD/YYYY")}
                />
                <YAxis
                  domain={[minMark, maxMark]}
                  tickFormatter={(value) => numConvert(value).toString()}
                />
                <Tooltip
                  labelFormatter={(date) => moment(date).format("MM/DD/YYYY")}
                  formatter={(value: number) => numConvert(value)}
                />
                <Line dataKey="mark" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
};

// One career-best table row per event, built from the flagged performances.
type BestsRow = {
  event_id: number;
  event_name: string;
  indoor_season_best: Performance | null;
  outdoor_season_best: Performance | null;
  indoor_overall_best: Performance | null;
  outdoor_overall_best: Performance | null;
  collegiate_best: Performance | null;
  personal_best: Performance | null;
};

const buildBests = (progression: Performance[]): BestsRow[] => {
  const byEvent = new Map<number, BestsRow>();

  for (const p of progression) {
    let row = byEvent.get(p.event_id);
    if (!row) {
      row = {
        event_id: p.event_id,
        event_name: p.Events.event_name,
        indoor_season_best: null,
        outdoor_season_best: null,
        indoor_overall_best: null,
        outdoor_overall_best: null,
        collegiate_best: null,
        personal_best: null,
      };
      byEvent.set(p.event_id, row);
    }
    const indoor = p.season === "i";
    if (p.is_season_best) row[indoor ? "indoor_season_best" : "outdoor_season_best"] = p;
    if (p.is_overall_best) row[indoor ? "indoor_overall_best" : "outdoor_overall_best"] = p;
    if (p.is_collegiate_best) row.collegiate_best = p;
    if (p.is_personal_best) row.personal_best = p;
  }

  return Array.from(byEvent.values())
    .filter((r) => r.personal_best !== null)
    .sort((a, b) => a.event_id - b.event_id);
};

type Params = Promise<{ athleteId: string }>;

const AthletePage = ({ params }: { params: Params }) => {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { athleteId } = await params;
        const response = await fetch(`/api/athlete/${athleteId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setAthlete(await response.json());
      } catch (err) {
        console.log("Error fetching athlete data:", err);
        setError(err instanceof Error ? err : new Error("Unknown error occurred"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params]);

  if (loading) return <h1>Loading...</h1>;
  if (error) return <div>Error: {error.message}</div>;
  if (!athlete) notFound();

  const thStyle: React.CSSProperties = {
    backgroundColor: "#921",
    color: "white",
    padding: "12px",
    textAlign: "left",
    border: "1px solid #ddd",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px",
    textAlign: "center",
    border: "1px solid #ddd",
  };
  const stickyFirstColumnStyle: React.CSSProperties = {
    position: "sticky",
    left: 0,
    backgroundColor: "#f9f9f9",
    zIndex: 1,
    borderRight: "5px solid #f9f9f9",
  };

  const filteredAthletes = athlete.other_athletes.filter((other) =>
    `${other.nickname ? other.nickname : other.first_name} ${other.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const bestsRows = buildBests(athlete.college_progression);

  const markLink = (p: Performance | null) =>
    p ? (
      <a href={p.result_link ?? undefined} target="_blank" rel="noopener noreferrer">
        {numConvert(p.mark)}
      </a>
    ) : null;

  const bioStyle = { flex: 1, fontSize: "1.1rem" };

  return (
    <div>
      <div className="p-6 mt-28">
        <Menu as="div" className="relative inline-block text-left w-64">
          <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Select an Athlete
            <ChevronDown className="ml-2 h-4 w-4" />
          </Menu.Button>
          <Menu.Items className="absolute left-0 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="p-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search athlete..."
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {filteredAthletes.length > 0 ? (
                filteredAthletes.map((other) => (
                  <Menu.Item key={other.athlete_id}>
                    {({ active }) => (
                      <a
                        href={`/athlete/${other.athlete_id}`}
                        className={`${
                          active ? "bg-blue-100 text-blue-900" : "text-gray-700"
                        } block px-4 py-2 text-sm`}
                      >
                        {other.nickname ? other.nickname : other.first_name} {other.last_name}
                      </a>
                    )}
                  </Menu.Item>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No athletes found.</div>
              )}
            </div>
          </Menu.Items>
        </Menu>

        <h1 className="text-3xl font-bold mt-6">
          {athlete.nickname ? athlete.nickname : athlete.first_name} {athlete.last_name} - Year: {athlete.year}
        </h1>

        <div className="flex flex-row items-start gap-5 mt-5 flex-wrap">
          <Image
            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_100/${athlete.athlete_id}_${athlete.image_path}.webp`}
            alt={`Roster photo for ${athlete.nickname ? athlete.nickname : athlete.first_name}`}
            width={300}
            height={400}
          />
          <div style={bioStyle}>
            {athlete.bio && <p>{athlete.bio}</p>}
            {athlete.awards.length > 0 && <h3><br />Awards</h3>}
            {athlete.awards.length > 0 && (
              <ul className="list-disc pl-5">
                {athlete.awards.map((award, index) => (
                  <li key={index}>{award}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <h3 className="text-3xl font-semibold mt-5 mb-5">Bests</h3>
        {bestsRows.length > 0 ? (
          <div>
            <div className="max-w-full overflow-x-auto mb-5">
              <table className="w-full border-collapse mb-7">
                <thead>
                  <tr>
                    <th style={{ ...thStyle, ...stickyFirstColumnStyle }}>Event</th>
                    <th style={thStyle}>Indoor Season Best</th>
                    <th style={thStyle}>Outdoor Season Best</th>
                    <th style={thStyle}>Indoor Overall Best</th>
                    <th style={thStyle}>Outdoor Overall Best</th>
                    <th style={thStyle}>Collegiate Best</th>
                    <th style={thStyle}>Personal Best</th>
                    <th style={thStyle}>Indoor Ranking</th>
                    <th style={thStyle}>Outdoor Ranking</th>
                  </tr>
                </thead>
                <tbody>
                  {bestsRows.map((row) => (
                    <tr key={row.event_id}>
                      <td style={{ ...tdStyle, ...stickyFirstColumnStyle }}>{row.event_name}</td>
                      <td style={tdStyle}>{markLink(row.indoor_season_best)}</td>
                      <td style={tdStyle}>{markLink(row.outdoor_season_best)}</td>
                      <td style={tdStyle}>{markLink(row.indoor_overall_best)}</td>
                      <td style={tdStyle}>{markLink(row.outdoor_overall_best)}</td>
                      <td style={tdStyle}>{markLink(row.collegiate_best)}</td>
                      <td style={tdStyle}>{markLink(row.personal_best)}</td>
                      <td style={tdStyle}>{row.indoor_overall_best?.ranking ?? ""}</td>
                      <td style={tdStyle}>{row.outdoor_overall_best?.ranking ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="text-lg font-semibold mt-4">College Best Progression</h3>
              <EventCharts data={athlete.college_progression} />
            </div>
          </div>
        ) : (
          <p>No best performances found.</p>
        )}
      </div>
    </div>
  );
};

export default AthletePage;
