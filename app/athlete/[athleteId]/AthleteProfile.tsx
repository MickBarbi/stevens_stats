"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import moment from "moment";
import Image from "next/image";
import useMediaQuery from "react-responsive";
import AthletePicker from "../AthletePicker";
import type { Athlete, PickerAthlete, ProgressionPerformance } from "@/lib/data";

type Perf = ProgressionPerformance;

// seconds -> "m:ss.hh"; leaves field marks / points (no decimal, or < 60) as-is
const numConvert = (value: number | string | null) => {
  if (value === "-" || value === null || value === undefined) return "-";
  const str = String(value);
  if (!str.includes(".")) return str;
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

const groupDataByEventAndSeason = (data: Perf[]) => {
  return data.reduce((acc: { [key: string]: Perf[] }, item) => {
    const key = `${item.event_id}-${item.season}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...item, mark: Number(item.mark) });
    return acc;
  }, {});
};

const sortDataByDate = (grouped: { [key: string]: Perf[] }) => {
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
  return grouped;
};

const getMinMaxWithPadding = (data: Perf[]) => {
  const marks = data.map((d) => Number(d.mark));
  const min = Math.min(...marks);
  const max = Math.max(...marks);
  const range = max - min;
  const padding = range * 0.05;
  return range === 0 ? [min - 1, max + 1] : [min - padding, max + padding];
};

const EventCharts: React.FC<{ data: Perf[] }> = ({ data }) => {
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const grouped = sortDataByDate(groupDataByEventAndSeason(data));

  return (
    <div>
      {Object.entries(grouped).map(([key, chartData]) => {
        if (chartData.length <= 1) return null;
        const season = key.split("-")[1];
        const [minMark, maxMark] = getMinMaxWithPadding(chartData);
        return (
          <div key={key} style={{ marginBottom: "40px", marginLeft: "30px" }}>
            <h3>
              Event: {chartData[0].event_name}, Season: {season === "i" ? "Indoor" : "Outdoor"}
            </h3>
            <ResponsiveContainer width={isSmallScreen ? "100%" : "75%"} height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => moment(d).format("MM/DD/YYYY")} />
                <YAxis
                  domain={[minMark, maxMark]}
                  tickFormatter={(value) => numConvert(value).toString()}
                />
                <Tooltip
                  labelFormatter={(d) => moment(d).format("MM/DD/YYYY")}
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

type BestsRow = {
  event_id: number;
  event_name: string;
  indoor_season_best: Perf | null;
  outdoor_season_best: Perf | null;
  indoor_overall_best: Perf | null;
  outdoor_overall_best: Perf | null;
  collegiate_best: Perf | null;
  personal_best: Perf | null;
};

const buildBests = (progression: Perf[]): BestsRow[] => {
  const byEvent = new Map<number, BestsRow>();
  for (const p of progression) {
    let row = byEvent.get(p.event_id);
    if (!row) {
      row = {
        event_id: p.event_id,
        event_name: p.event_name,
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

const AthleteProfile = ({
  athlete,
  progression,
  others,
}: {
  athlete: Athlete;
  progression: Perf[];
  others: PickerAthlete[];
}) => {
  const bestsRows = buildBests(progression);

  const markLink = (p: Perf | null) =>
    p ? (
      <a href={p.result_link ?? undefined} target="_blank" rel="noopener noreferrer">
        {numConvert(p.mark)}
      </a>
    ) : null;

  return (
    <div>
      <div className="p-6 mt-28">
        <AthletePicker athletes={others} />

        <h1 className="text-3xl font-bold mt-6">
          {athlete.nickname ? athlete.nickname : athlete.first_name} {athlete.last_name} - Year:{" "}
          {athlete.year}
        </h1>

        <div className="flex flex-row items-start gap-5 mt-5 flex-wrap">
          <Image
            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_100/${athlete.athlete_id}_${athlete.image_path}.webp`}
            alt={`Roster photo for ${athlete.nickname ? athlete.nickname : athlete.first_name}`}
            width={300}
            height={400}
          />
          <div style={{ flex: 1, fontSize: "1.1rem" }}>
            {athlete.bio && <p>{athlete.bio}</p>}
            {athlete.awards.length > 0 && (
              <h3>
                <br />
                Awards
              </h3>
            )}
            {athlete.awards.length > 0 && (
              <ul className="list-disc pl-5">
                {athlete.awards.map((award, i) => (
                  <li key={i}>{award}</li>
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
              <EventCharts data={progression} />
            </div>
          </div>
        ) : (
          <p>No best performances found.</p>
        )}
      </div>
    </div>
  );
};

export default AthleteProfile;
