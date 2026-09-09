"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import moment from "moment";
import useMediaQuery from "react-responsive";
import { Medal } from "lucide-react";
import AthletePicker from "../AthletePicker";
import { teamRank, type Athlete, type PickerAthlete, type ProgressionPerformance } from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import AthletePhoto from "@/components/ui/AthletePhoto";

type Perf = ProgressionPerformance;

const YEAR_LABEL: Record<number, string> = {
  1: "First-Year",
  2: "Sophomore",
  3: "Junior",
  4: "Senior",
  5: "Grad Student",
  6: "Grad Student",
};

type Specialty = { event_id: number; event_name: string; count: number; rank: number | null };

// The events an athlete is known for: those they hold a team ranking in first
// (best rank wins), then their most-competed events.
const deriveSpecialties = (
  prog: Perf[],
  athleteId: number,
  sex: string | null
): Specialty[] => {
  const byEvent = new Map<number, { name: string; count: number }>();
  for (const p of prog) {
    const e = byEvent.get(p.event_id);
    if (e) e.count += 1;
    else byEvent.set(p.event_id, { name: p.event_name, count: 1 });
  }
  const specs: Specialty[] = [];
  for (const [event_id, e] of byEvent) {
    const ranks = [
      teamRank(athleteId, event_id, "indoor", sex),
      teamRank(athleteId, event_id, "outdoor", sex),
    ].filter((r): r is number => r != null);
    specs.push({
      event_id,
      event_name: e.name,
      count: e.count,
      rank: ranks.length ? Math.min(...ranks) : null,
    });
  }
  specs.sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank || b.count - a.count;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return b.count - a.count;
  });
  return specs;
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
  const fullName = `${displayName} ${athlete.last_name}`;

  const specialties = deriveSpecialties(progression, athlete.athlete_id, athlete.sex);
  const headline = specialties[0] ?? null;
  const headlinePB = headline
    ? progression.find((p) => p.event_id === headline.event_id && p.is_personal_best) ?? null
    : null;

  const rankOf = (season: "indoor" | "outdoor", eventId: number) =>
    teamRank(athlete.athlete_id, eventId, season, athlete.sex);

  const markLink = (p: Perf | null, sr = false) =>
    p ? (
      <span className="inline-flex items-center gap-1.5">
        <a href={p.result_link ?? undefined} target="_blank" rel="noopener noreferrer">
          {formatMark(p.mark, markKind(p.event_id))}
        </a>
        {sr && <Badge kind="sr" />}
      </span>
    ) : null;

  const rankText = (n: number | null) =>
    n == null ? "" : <span className={n === 1 ? "font-semibold text-brand" : undefined}>#{n}</span>;

  return (
    <div className="space-y-8">
      <AthletePicker athletes={others} />

      <Card className="flex flex-wrap items-start gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="relative aspect-[3/4] w-full max-w-[200px] shrink-0 overflow-hidden rounded-card border border-border sm:w-[200px]">
          <AthletePhoto athlete={athlete} sizes="200px" priority />
        </div>
        <div className="min-w-[15rem] flex-1">
          <h1 className="page-title">{fullName}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="chip">{YEAR_LABEL[athlete.year] ?? `Year ${athlete.year}`}</span>
            {athlete.sex && (
              <span>{athlete.sex === "m" ? "Men's" : "Women's"} Track &amp; Field</span>
            )}
          </div>

          {headline && headlinePB && (
            <p className="mt-3 text-lg text-fg">
              <span className="font-semibold">{headline.event_name}</span>{" "}
              <span className="font-mono tabular-nums text-fg-muted">
                PB {formatMark(headlinePB.mark, markKind(headline.event_id))}
              </span>
              {headline.rank != null && (
                <>
                  {" · "}
                  {headline.rank === 1 ? (
                    <span className="font-semibold text-brand">School Record</span>
                  ) : (
                    <span className="text-fg-muted">#{headline.rank} all-time</span>
                  )}
                </>
              )}
            </p>
          )}

          {specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {specialties.slice(0, 4).map((s) => (
                <span key={s.event_id} className="chip">
                  {s.event_name}
                  {s.rank != null && <span className="text-fg-subtle">#{s.rank}</span>}
                </span>
              ))}
            </div>
          )}

          {athlete.bio && <p className="mt-4 leading-relaxed text-fg">{athlete.bio}</p>}

          {athlete.awards.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Awards
              </h2>
              <ul className="flex flex-wrap gap-2">
                {athlete.awards.map((award, i) => (
                  <li key={i} className="chip">
                    <Medal className="h-3.5 w-3.5 shrink-0 text-sb" aria-hidden />
                    {award}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <div>
        <h2 className="section-title mb-4">Bests</h2>
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
                    <th>Indoor Rank</th>
                    <th>Outdoor Rank</th>
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
                      <td>{markLink(row.indoor_overall_best, rankOf("indoor", row.event_id) === 1)}</td>
                      <td>{markLink(row.outdoor_overall_best, rankOf("outdoor", row.event_id) === 1)}</td>
                      <td>{markLink(row.collegiate_best)}</td>
                      <td>{markLink(row.personal_best)}</td>
                      <td>{rankText(rankOf("indoor", row.event_id))}</td>
                      <td>{rankText(rankOf("outdoor", row.event_id))}</td>
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
