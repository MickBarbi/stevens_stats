"use client";

// Split out of AthleteProfile.tsx so the page's initial JS doesn't have to
// carry Recharts (it's the single biggest chunk of an athlete page's bundle,
// and doesn't tree-shake well) — loaded via next/dynamic from AthleteProfile
// instead, after the rest of the page has already rendered.
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
import type { ProgressionPerformance } from "@/lib/data";
import { formatMark, markKind, type MarkKind } from "@/lib/format";

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

// Chart date labels (epoch ms -> string). Plain Date math — the charts only
// need month/day/year, not a whole date library.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtMonthDay = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const fmtMonthYear = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ’${String(d.getFullYear()).slice(-2)}`;
};
const fmtLongDate = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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
  const lo = new Date(tsMin);
  const cur = new Date(lo.getFullYear(), lo.getMonth(), 1);
  const hi = new Date(tsMax);
  const end = new Date(hi.getFullYear(), hi.getMonth() + 1, 0).getTime();
  while (cur.getTime() <= end) {
    const t = cur.getTime();
    if (t >= tsMin && t <= tsMax) out.push(t);
    cur.setMonth(cur.getMonth() + stepMonths);
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

const AXIS = "rgb(150 138 132)";

export default function EventCharts({ data }: { data: Perf[] }) {
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
          spanDays < 75 ? fmtMonthDay(ms) : fmtMonthYear(ms);

        // A little breathing room past the last mark so its value label has
        // somewhere to sit without clipping the right edge.
        const xPad = Math.max((tsMax - tsMin) * 0.06, 5 * 86_400_000);

        // text alternative for the chart — screen readers get the shape of the
        // progression, not a wall of SVG.
        const chartLabel =
          `${chartData[0].event_name}, ${season === "i" ? "indoor" : "outdoor"}: ` +
          `best mark went from ${formatMark(points[0].mark, kind)} to ` +
          `${formatMark(pbVal, kind)} between ${fmtMonthYear(tsMin)} and ` +
          `${fmtMonthYear(tsMax)}.`;

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
            <div role="img" aria-label={chartLabel}>
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
                  labelFormatter={(ms) => fmtLongDate(Number(ms))}
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
            </div>
          </figure>
        );
      })}
    </div>
  );
}
