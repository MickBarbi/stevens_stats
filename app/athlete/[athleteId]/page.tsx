"use client";

import React, { useEffect, useState } from "react";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import Image from "next/image";
import useMediaQuery from 'react-responsive';
import { notFound } from "next/navigation";

const get_index = (performance_id: number, performances: Performance[]) => {
  for (let i = 0; i < performances.length; i++){
    if (performances[i].performance_id === performance_id){
      return i;
    }
  }
  return performances.length - 1;
}

const groupDataByEventAndSeason = (data: Performance[]) => {
  return data.reduce((acc: { [key: string]: Performance[] }, item) => {
    const key = `${item.event_id}-${item.season}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      ...item,
      date: new Date(item.date), // Convert date to Date object
      mark: item.mark, // Convert mark to number
    });
    return acc;
  }, {});
};

// Utility to sort data by date
const sortDataByDate = (groupedData: { [key: string]: Performance[] }) => {
  Object.keys(groupedData).forEach((key) => {
    // Ensure that groupedData[key] is an array of Performance objects
    const data = groupedData[key];

    if (Array.isArray(data)) {
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  });
  return groupedData;
};

// Utility to find the min and max values for the y-axis, and add dynamic padding
const getMinMaxWithPadding = (data: Performance[]) => {
  const marks = data.map(d => d.mark);
  const min = Math.min(...marks);
  const max = Math.max(...marks);
  const range = max - min;

  // Apply dynamic padding (5% of the range)
  const padding = range * 0.05;

  // If range is 0 (i.e., all marks are the same), add a small fixed padding
  const dynamicMin = range === 0 ? min - 1 : min - padding;
  const dynamicMax = range === 0 ? max + 1 : max + padding;

  return [dynamicMin, dynamicMax];
};

// EventCharts component
const EventCharts: React.FC<EventChartsProps> = ({ data }) => {
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });

  const groupedData = groupDataByEventAndSeason(data);
  const sortedGroupedData = sortDataByDate(groupedData);

  return (
    <div>
      {Object.entries(sortedGroupedData).map(([key, chartData]) => {
        if (chartData.length <= 1) return null;

        const [eventId, season] = key.split('-');
        const [minMark, maxMark] = getMinMaxWithPadding(chartData);
        return (
          <div key={key} style={{ marginBottom: '40px', marginLeft: '30px' }}>
            <h3>Event: {event_name_key[eventId]}, Season: {season === 'i' ? 'Indoor' : 'Outdoor'}</h3>
            <ResponsiveContainer width={isSmallScreen ? '100%' : '75%'} height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => moment(date).format('MM/DD/YYYY')} 
                />
                <YAxis domain={[minMark, maxMark]} tickFormatter={(value) => numConvert(value).toString()}/>
                <Tooltip labelFormatter={(date) => moment(date).format('MM/DD/YYYY')} formatter={(value: number) => numConvert(value)} />
                <Line dataKey="mark" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
};

const numConvert = (seconds: number | string) => {
  if (seconds === "-" || seconds === null) {
    return "-";
  }
  seconds = String(seconds);
  if (!seconds.includes(".")) {
    return seconds;
  }
  seconds = Number(seconds);
  if (seconds > 60) {
    let minutes = 0;
    while (seconds > 60) {
      minutes++;
      seconds -= 60;
    }
    return `${minutes}:${seconds.toFixed(2).toString().padStart(5, "0")}`;
  }
  return seconds.toFixed(2).toString().padStart(5, "0");
};

const event_name_key: {[key: string]: string} = {
  1: "60 Meters",
  2: "100 Meters",
  3: "200 Meters",
  4: "400 Meters",
  5: "600 Meters",
  6: "800 Meters",
  7: "1000 Meters",
  8: "1500 Meters",
  9: "Mile",
  10: "3000 Meters",
  11: "5000 Meters",
  12: "10,000 Meters",
  13: "60 Hurdles",
  14: "100 Hurdles",
  15: "110 Hurdles",
  16: "400 Hurdles",
  17: "3000 Steeplechase",
  18: "High Jump",
  19: "Pole Vault",
  20: "Long Jump",
  21: "Triple Jump",
  22: "Shot Put",
  23: "Discus",
  24: "Hammer",
  25: "Weight Throw",
  26: "Javelin",
  27: "Pentathlon",
  28: "Heptathlon",
  29: "Decathlon"
};

// Function to get the event name from a number
function getEventName(eventNumber: number) {
  return event_name_key[eventNumber] || "Event not found";
}

interface Best {
  result_id: number;
  athlete_id: number;
  event_id: number;
  season_best_indoor: number | null;
  season_best_outdoor: number | null;
  overall_best_indoor: number | null;
  overall_best_outdoor: number | null;
  collegiate_best: number | null;
  personal_best: number;
  rank_position_indoor: number | null;
  rank_position_outdoor: number | null;
}

type Others = {
  athlete_id: number;
  first_name: string;
  last_name: string;
}

type Performance = {
  performance_id: number;
  athlete_id: number;
  event_id: number;
  mark: number;
  season: string;
  date: Date;
  result_link: string;
  ranking: number | null;
}

type Athlete = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  year: number;
  graduation_year: number | null;
  sex: string;
  nickname: string | null;
  bio: string | null;
  image_path: string | null;
  bests: Best[];
  college_progression: Performance[];
  other_athletes: Others[];
  awards: string[];
};

interface EventChartsProps {
  data: Performance[]; // Expecting an array of Performance objects
}

type Params = Promise<{ athleteId: string }>;

interface PageProps {
  params: Params;
}

const AthletePage = ({ params }: PageProps) => {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resolvedParams = await params;
        const athleteId = resolvedParams.athleteId;

        const response = await fetch(`/api/athlete/${athleteId}`); // Fetch data from the API route
        if (!response.ok){
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setAthlete(result);
      } catch (error) {
        console.log("Error fetching athlete data:", error);
        setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params]);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (error){
    return <div>Error: {error.message}</div>
  }

  if (!athlete) {
    notFound();
  }

  const thStyle: React.CSSProperties = {
    backgroundColor: '#921',
    color: 'white',
    padding: '12px',
    textAlign: 'left',
    border: '1px solid #ddd',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'center',
    border: '1px solid #ddd',
  };

  // Additional styles for making the first column sticky
  const stickyFirstColumnStyle: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    backgroundColor: '#f9f9f9', // Matches table background or set as needed
    zIndex: 1, // Ensure it stays above other cells
    borderRight: '5px solid #f9f9f9', // Adds a wider left border to block content behind
  };

  // Filter athletes based on search term
  const filteredAthletes = athlete.other_athletes.filter((other) =>
    `${other.first_name} ${other.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Media query for screens smaller than 640px
  const bioStyle = {
    flex: 1,
    fontSize: '1.1rem',
    '@media (maxWidth: 640px)': {
      flexDirection: 'column',
      alignItems: 'flex-start', // Moves the bio section below the photo
    },
  };
  
  return (
    <div>
      <div className="p-6 mt-28">
        <Menu as="div" className="relative inline-block text-left w-64">
          <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Select an Athlete
            <ChevronDown className="ml-2 h-4 w-4" />
          </Menu.Button>
          <Menu.Items className="absolute left-0 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* Search Bar */}
            <div className="p-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search athlete..."
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Athlete List */}
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {filteredAthletes.length > 0 ? (
                filteredAthletes.map((other) => (
                  <Menu.Item key={other.athlete_id}>
                    {({ active }) => (
                      <a
                        href={`/athlete/${other.athlete_id}`}
                        className={`${
                          active ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                        } block px-4 py-2 text-sm`}
                      >
                        {other.first_name} {other.last_name}
                      </a>
                    )}
                  </Menu.Item>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No athletes found.
                </div>
              )}
            </div>
          </Menu.Items>
        </Menu>

        <h1 className="text-3xl font-bold mt-6">
          {athlete.first_name} {athlete.last_name}  -  Year: {athlete.year}
        </h1>
        {/* Flexbox layout for image and text */}
        <div className="flex flex-row items-start gap-5 mt-5 flex-wrap">
          {/* Image Section */}
          <Image
            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_100/${athlete.athlete_id}_${athlete.image_path}.webp`}
            alt={`Roster photo for ${athlete.first_name}`}
            width={300}
            height={400}
          />

          {/* Bio and Year Section */}
          <div style={bioStyle}>
            {athlete.bio && <p>{athlete.bio}</p>}
            {athlete.awards.length > 0 && <h3><br/>Awards</h3>}
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
        {athlete.bests.length > 0 ? (
          <div>
            <div className="max-w-full overflow-x-auto mb-5">
              <table className="w-full border-collapse mb-7">
                <thead>
                  <tr>
                    <th style={{ ...thStyle, ...stickyFirstColumnStyle}}>Event</th>
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
                  {athlete.bests.map((best: Best) => (
                  <tr key={best.event_id}>
                    <td style={{ ...tdStyle, ...stickyFirstColumnStyle}}>{getEventName(best.event_id)}</td>
                    <td style={tdStyle}>
                      {best.season_best_indoor && (
                        <a href={`${athlete.college_progression[get_index(best.season_best_indoor, athlete.college_progression)].result_link}`} target="_blank" rel="noopener noreferrer">{numConvert(athlete.college_progression[get_index(best.season_best_indoor, athlete.college_progression)].mark)}</a>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {best.season_best_outdoor && (
                        <a href={`${athlete.college_progression[get_index(best.season_best_outdoor, athlete.college_progression)].result_link}`} target="_blank" rel="noopener noreferrer">{numConvert(athlete.college_progression[get_index(best.season_best_outdoor, athlete.college_progression)].mark)}</a>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {best.overall_best_indoor && (
                        <a href={`${athlete.college_progression[get_index(best.overall_best_indoor, athlete.college_progression)].result_link}`} target="_blank" rel="noopener noreferrer">{numConvert(athlete.college_progression[get_index(best.overall_best_indoor, athlete.college_progression)].mark)}</a>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {best.overall_best_outdoor && (
                        <a href={`${athlete.college_progression[get_index(best.overall_best_outdoor, athlete.college_progression)].result_link}`} target="_blank" rel="noopener noreferrer">{numConvert(athlete.college_progression[get_index(best.overall_best_outdoor, athlete.college_progression)].mark)}</a>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {best.collegiate_best && (
                        <a href={`${athlete.college_progression[get_index(best.collegiate_best, athlete.college_progression)].result_link}`} target="_blank" rel="noopener noreferrer">{numConvert(athlete.college_progression[get_index(best.collegiate_best, athlete.college_progression)].mark)}</a>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {best.personal_best && (
                        <a href={`${athlete.college_progression[get_index(best.personal_best, athlete.college_progression)].result_link}`} target="_blank" rel="noopener noreferrer">{numConvert(athlete.college_progression[get_index(best.personal_best, athlete.college_progression)].mark)}</a>
                      )}
                    </td>
                    <td style={tdStyle}>{best.overall_best_indoor && athlete.college_progression[get_index(best.overall_best_indoor, athlete.college_progression)].ranking}</td>
                    <td style={tdStyle}>{best.overall_best_outdoor && athlete.college_progression[get_index(best.overall_best_outdoor, athlete.college_progression)].ranking}</td>
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
