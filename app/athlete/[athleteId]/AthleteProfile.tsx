"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import moment from "moment";
import Link from "next/link";
import { Medal, ChevronLeft, ChevronRight, LineChart } from "lucide-react";
import AthletePicker from "../AthletePicker";
import {
  alumniLabel,
  teamRank,
  type Athlete,
  type PickerAthlete,
  type ProgressionPerformance,
} from "@/lib/data";
import { formatMark, markKind, type MarkKind } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import AthletePhoto from "@/components/ui/AthletePhoto";
import ShareButton from "@/components/ui/ShareButton";
import EmptyState from "@/components/ui/EmptyState";

const pickerLabel = (a: PickerAthlete) =>
  `${a.nickname ? a.nickname : a.first_name} ${a.last_name}`;

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

// Step sizes that read cleanly on a track & field axis (seconds, metres,
// points). niceDomain() rounds a raw [min,max] out to the nearest of these so
// the y-axis shows 7.4 / 7.6 / 7.8 instead of 7.43 / 7.61 / 7.79.
const NICE_STEPS = [
  0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 15, 20, 30,
  60, 120, 300, 600,
];

const niceDomain = (
  min: number,
  max: number,
  target = 4
): { domain: [number, number]; ticks: number[] } => {
  if (!(max > min)) {
    const pad = Math.abs(min) > 1 ? 0.5 : 0.05;
    return { domain: [min - pad, max + pad], ticks: [min] };
  }
  const rawStep = (max - min) / target;
  let step = NICE_STEPS.find((s) => s >= rawStep) ?? rawStep;
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if ((hi - lo) / step > 6) {
    const i = NICE_STEPS.indexOf(step);
    if (i >= 0 && i + 1 < NICE_STEPS.length) {
      step = NICE_STEPS[i + 1];
      lo = Math.floor(min / step) * step;
      hi = Math.ceil(max / step) * step;
    }
  }
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { domain: [Number(lo.toFixed(6)), Number(hi.toFixed(6))], ticks };
};

// Month-boundary ticks across an elapsed-time span, spaced so ~4-6 labels land
// on the axis. Returns raw epoch ms.
const monthTicks = (tsMin: number, tsMax: number): number[] => {
  const months = (tsMax - tsMin) / (1000 * 60 * 60 * 24 * 30.44);
  const stepMonths = months <= 6 ? 1 : months <= 14 ? 3 : months <= 30 ? 6 : 12;
  const out: number[] = [];
  const cur = moment(tsMin).startOf("month");
  const end = moment(tsMax).endOf("month");
  while (cur.isSameOrBefore(end)) {
    const t = cur.valueOf();
    if (t >= tsMin && t <= tsMax) out.push(t);
    cur.add(stepMonths, "month");
  }
  return out.length >= 2 ? out : [tsMin, tsMax];
};

// "3 wk" / "8 mo" / "1.5 yr" — how long the improvement took.
const humanSpan = (ms: number): string => {
  const days = ms / 86_400_000;
  if (days < 31) return `${Math.max(1, Math.round(days / 7))} wk`;
  const months = days / 30.44;
  if (months < 12) return `${Math.round(months)} mo`;
  const years = days / 365.25;
  return years < 2 ? `${years.toFixed(1)} yr` : `${Math.round(years)} yr`;
};

// The size of the gain, in the event's own unit.
const formatDelta = (delta: number, kind: MarkKind): string => {
  if (kind === "points") return `${Math.round(delta)} pts`;
  if (kind === "distance") return `${delta.toFixed(2)} m`;
  return `${delta.toFixed(2)}s`;
};

// Axis gridline labels want less precision than a result line — trim the
// trailing hundredths off m:ss times so ticks read "11:45" not "11:45.00".
const formatAxisMark = (value: number, kind: MarkKind): string => {
  const s = formatMark(value, kind);
  if (kind !== "time" || !s.includes(":")) return s;
  return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
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

/** Tiny inline trend line — improvement always reads upward. */
const Sparkline = ({
  points,
  higherIsBetter,
}: {
  points: number[];
  higherIsBetter: boolean;
}) => {
  if (points.length < 2) return null;
  const w = 76;
  const h = 24;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) => {
    const up = higherIsBetter ? (v - min) / span : 1 - (v - min) / span;
    return pad + (1 - up) * (h - 2 * pad);
  };
  const last = points.length - 1;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 text-[color:var(--chart-line)]"
      aria-hidden
    >
      <polyline
        points={points.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(last)} cy={y(points[last])} r="2" fill="currentColor" />
    </svg>
  );
};

const AXIS = "rgb(140 140 140)";

const EventCharts: React.FC<{ data: Perf[] }> = ({ data }) => {
  const grouped = sortDataByDate(groupDataByEventAndSeason(data));

  return (
    <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2">
      {Object.entries(grouped).map(([key, group]) => {
        const chartData = bestProgression(group, group[0].higher_is_better);
        if (chartData.length <= 1) return null;

        const season = key.split("-")[1];
        const kind = markKind(group[0].event_id);
        const higher = group[0].higher_is_better;

        // Space points by when they actually happened, not evenly — a long flat
        // stretch to the last dot means it took that long to take the next
        // slice off.
        const points = chartData.map((p) => ({
          ts: new Date(`${p.date}T00:00:00`).getTime(),
          mark: p.mark as number,
        }));
        const tsMin = points[0].ts;
        const tsMax = points[points.length - 1].ts;

        const marks = points.map((p) => p.mark);
        const yd = niceDomain(Math.min(...marks), Math.max(...marks));
        const pbVal = higher ? Math.max(...marks) : Math.min(...marks);

        const delta = Math.abs(points[points.length - 1].mark - points[0].mark);
        const gradId = `prog-grad-${key}`;

        // Short spans get day-level x labels; longer ones just month + year.
        const spanDays = (tsMax - tsMin) / 86_400_000;
        const xTickFormat = (ms: number) =>
          moment(ms).format(spanDays < 75 ? "MMM D" : "MMM [’]YY");

        // A little breathing room past the last mark so its value label has
        // somewhere to sit without clipping the right edge.
        const xPad = Math.max((tsMax - tsMin) * 0.06, 5 * 86_400_000);

        return (
          <figure key={key} className="text-[color:var(--chart-line)]">
            <figcaption className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-fg">
                {chartData[0].event_name}
                <span className="text-fg-muted">
                  {" · "}
                  {season === "i" ? "Indoor" : "Outdoor"}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-pb">
                {higher ? "▲" : "▼"} {formatDelta(delta, kind)}
                <span className="text-fg-muted">
                  {" · "}
                  {humanSpan(tsMax - tsMin)}
                </span>
              </span>
            </figcaption>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={points} margin={{ top: 18, right: 14, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(140 140 140 / 0.14)" vertical={false} />
                <XAxis
                  type="number"
                  dataKey="ts"
                  domain={[tsMin, tsMax + xPad]}
                  ticks={monthTicks(tsMin, tsMax)}
                  tickFormatter={xTickFormat}
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickLine={false}
                  axisLine={{ stroke: "rgb(140 140 140 / 0.4)" }}
                  minTickGap={20}
                />
                <YAxis
                  type="number"
                  domain={yd.domain}
                  ticks={yd.ticks}
                  tickFormatter={(value) => formatAxisMark(value, kind)}
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  labelFormatter={(ms) => moment(ms).format("MMM D, YYYY")}
                  formatter={(value: number) => [formatMark(value, kind), "Mark"]}
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--fg)",
                  }}
                  labelStyle={{ color: "var(--fg-muted)" }}
                />
                <ReferenceLine
                  y={pbVal}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  strokeOpacity={0.32}
                  label={{
                    // The curve leaves the left corner open — below the line
                    // for races (line sits low), above it for jumps (line sits
                    // high) — so the PB label lands in clear space either way.
                    value: `PB ${formatMark(pbVal, kind)}`,
                    position: higher ? "insideBottomLeft" : "insideTopLeft",
                    fontSize: 11,
                    fontWeight: 600,
                    fill: "currentColor",
                  }}
                />
                <Area
                  type="linear"
                  dataKey="mark"
                  stroke="currentColor"
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                  dot={{ r: 3, fill: "currentColor", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
                <ReferenceDot x={tsMax} y={pbVal} r={4} fill="currentColor" stroke="none" />
              </AreaChart>
            </ResponsiveContainer>
          </figure>
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
  prev,
  next,
}: {
  athlete: Athlete;
  progression: Perf[];
  others: PickerAthlete[];
  prev: PickerAthlete | null;
  next: PickerAthlete | null;
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AthletePicker athletes={others} />
        {(prev || next) && (
          <nav className="ml-auto flex items-center gap-1 text-sm">
            {prev && (
              <Link
                href={`/athlete/${prev.athlete_id}`}
                className="inline-flex max-w-[9rem] items-center gap-0.5 rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{pickerLabel(prev)}</span>
              </Link>
            )}
            {next && (
              <Link
                href={`/athlete/${next.athlete_id}`}
                className="inline-flex max-w-[9rem] items-center gap-0.5 rounded-md px-2 py-1 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
              >
                <span className="truncate">{pickerLabel(next)}</span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            )}
          </nav>
        )}
      </div>

      <Card className="flex flex-wrap items-start gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="relative aspect-[3/4] w-full max-w-[200px] shrink-0 overflow-hidden rounded-card border border-border sm:w-[200px]">
          <AthletePhoto athlete={athlete} sizes="200px" priority />
        </div>
        <div className="min-w-[15rem] flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="page-title">{fullName}</h1>
            <ShareButton title={`${fullName} — Stevens Stats`} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="chip">
              {athlete.active
                ? YEAR_LABEL[athlete.year] ?? `Year ${athlete.year}`
                : alumniLabel(athlete)}
            </span>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bestsRows.map((row) => {
                const kind = markKind(row.event_id);
                const ri = rankOf("indoor", row.event_id);
                const ro = rankOf("outdoor", row.event_id);
                const pb = row.personal_best!;
                const evPerfs = progression
                  .filter((p) => p.event_id === row.event_id)
                  .sort((a, b) => a.date.localeCompare(b.date));
                const hib = evPerfs[0]?.higher_is_better ?? false;
                const spark = bestProgression(evPerfs, hib).map((p) => Number(p.mark));
                const pbText = formatMark(pb.mark, kind);

                const markLink = (p: Perf) => (
                  <a
                    href={p.result_link ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg hover:text-link"
                  >
                    {formatMark(p.mark, kind)}
                  </a>
                );

                const detailRows: { label: string; best: Perf; rank: number | null }[] = [
                  { label: "Indoor", best: row.indoor_overall_best, rank: ri },
                  { label: "Outdoor", best: row.outdoor_overall_best, rank: ro },
                  { label: "Indoor SB", best: row.indoor_season_best, rank: null },
                  { label: "Outdoor SB", best: row.outdoor_season_best, rank: null },
                  {
                    label: "Collegiate",
                    best:
                      row.collegiate_best &&
                      formatMark(row.collegiate_best.mark, kind) !== pbText
                        ? row.collegiate_best
                        : null,
                    rank: null,
                  },
                ].filter(
                  (r): r is { label: string; best: Perf; rank: number | null } => r.best != null
                );

                return (
                  <Card key={row.event_id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-fg">{row.event_name}</h3>
                      {(ri === 1 || ro === 1) && <Badge kind="sr" />}
                    </div>

                    <div className="mt-1 flex items-end justify-between gap-3">
                      <a
                        href={pb.result_link ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-2xl font-semibold tabular-nums text-fg hover:text-link"
                      >
                        {pbText}
                      </a>
                      <Sparkline points={spark} higherIsBetter={hib} />
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-fg-subtle">
                      Personal Best
                    </p>

                    {detailRows.length > 0 && (
                      <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                        {detailRows.map((r) => (
                          <div
                            key={r.label}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <dt className="text-fg-muted">{r.label}</dt>
                            <dd className="flex items-baseline gap-2 font-mono tabular-nums">
                              {markLink(r.best)}
                              {r.rank != null && (
                                <span
                                  className={
                                    r.rank === 1
                                      ? "font-semibold text-brand"
                                      : "text-fg-subtle"
                                  }
                                >
                                  #{r.rank}
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </Card>
                );
              })}
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-fg">College Best Progression</h3>
              <EventCharts data={progression} />
            </div>
          </div>
        ) : (
          <EmptyState icon={LineChart} title="No results on file yet">
            Once {athlete.nickname ?? athlete.first_name} has marks in the
            system, bests and progression charts will show up here.
          </EmptyState>
        )}
      </div>
    </div>
  );
};

export default AthleteProfile;
