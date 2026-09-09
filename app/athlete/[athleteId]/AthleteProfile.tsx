"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import moment from "moment";
import Image from "next/image";
import useMediaQuery from "react-responsive";
import AthletePicker from "../AthletePicker";
import type { Athlete, PickerAthlete, ProgressionPerformance } from "@/lib/data";
import { athletePhotoUrl } from "@/lib/photo";
import { formatMark, markKind } from "@/lib/format";

type Perf = ProgressionPerformance;

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

// Keep only the results that were a best-to-date, so the line only ever moves
// in the improving direction (down for races, up for jumps/throws/multis).
const bestProgression = (sortedAsc: Perf[], higherIsBetter: boolean): Perf[] => {
  const out: Perf[] = [];
  let best = higherIsBetter ? -Infinity : Infinity;
  for (const p of sortedAsc) {
    const m = Number(p.mark);
    if (higherIsBetter ? m > best : m < best) {
      best = m;
      out.push({ ...p, mark: m });
    }
  }
  return out;
};

const EventCharts: React.FC<{ data: Perf[] }> = ({ data }) => {
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const grouped = sortDataByDate(groupDataByEventAndSeason(data));

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([key, group]) => {
        const chartData = bestProgression(group, group[0].higher_is_better);
        if (chartData.length <= 1) return null;
        const season = key.split("-")[1];
        const kind = markKind(group[0].event_id);
        const [minMark, maxMark] = getMinMaxWithPadding(chartData);
        return (
          <div key={key}>
            <h3 className="mb-2 text-sm font-medium text-fg-muted">
              {chartData[0].event_name} · {season === "i" ? "Indoor" : "Outdoor"}
            </h3>
            <div className="text-[color:var(--chart-line)]">
              <ResponsiveContainer width={isSmallScreen ? "100%" : "80%"} height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(128 128 128 / 0.22)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => moment(d).format("MM/DD/YY")}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[minMark, maxMark]}
                    tickFormatter={(value) => formatMark(value, kind)}
                    tick={{ fontSize: 12 }}
                    width={64}
                  />
                  <Tooltip
                    labelFormatter={(d) => moment(d).format("MMM D, YYYY")}
                    formatter={(value: number) => [formatMark(value, kind), "Mark"]}
                    contentStyle={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--fg)",
                    }}
                    labelStyle={{ color: "var(--fg-muted)" }}
                  />
                  <Line
                    dataKey="mark"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
  const displayName = athlete.nickname ? athlete.nickname : athlete.first_name;

  const markLink = (p: Perf | null) =>
    p ? (
      <a href={p.result_link ?? undefined} target="_blank" rel="noopener noreferrer">
        {formatMark(p.mark, markKind(p.event_id))}
      </a>
    ) : null;

  return (
    <div className="space-y-8">
      <AthletePicker athletes={others} />

      <div className="flex flex-wrap items-start gap-6">
        <Image
          src={athletePhotoUrl(athlete)}
          alt={`Roster photo for ${displayName}`}
          width={260}
          height={347}
          className="rounded-card border border-border object-cover"
        />
        <div className="min-w-[16rem] flex-1">
          <h1 className="text-3xl font-bold text-fg">
            {displayName} {athlete.last_name}
          </h1>
          <p className="mt-1 text-fg-muted">Year {athlete.year}</p>
          {athlete.bio && <p className="mt-4 leading-relaxed text-fg">{athlete.bio}</p>}
          {athlete.awards.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">
                Awards
              </h2>
              <ul className="flex flex-wrap gap-2">
                {athlete.awards.map((award, i) => (
                  <li key={i} className="chip">
                    {award}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold text-fg">Bests</h2>
        {bestsRows.length > 0 ? (
          <div className="space-y-8">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20">Event</th>
                    <th>Indoor Season Best</th>
                    <th>Outdoor Season Best</th>
                    <th>Indoor Overall Best</th>
                    <th>Outdoor Overall Best</th>
                    <th>Collegiate Best</th>
                    <th>Personal Best</th>
                    <th>Indoor Ranking</th>
                    <th>Outdoor Ranking</th>
                  </tr>
                </thead>
                <tbody>
                  {bestsRows.map((row) => (
                    <tr key={row.event_id}>
                      <td className="sticky left-0 z-10 bg-surface-raised text-left font-medium">
                        {row.event_name}
                      </td>
                      <td>{markLink(row.indoor_season_best)}</td>
                      <td>{markLink(row.outdoor_season_best)}</td>
                      <td>{markLink(row.indoor_overall_best)}</td>
                      <td>{markLink(row.outdoor_overall_best)}</td>
                      <td>{markLink(row.collegiate_best)}</td>
                      <td>{markLink(row.personal_best)}</td>
                      <td>{row.indoor_overall_best?.ranking ?? ""}</td>
                      <td>{row.outdoor_overall_best?.ranking ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-semibold text-fg">College Best Progression</h3>
              <EventCharts data={progression} />
            </div>
          </div>
        ) : (
          <p className="text-fg-muted">No best performances found.</p>
        )}
      </div>
    </div>
  );
};

export default AthleteProfile;
