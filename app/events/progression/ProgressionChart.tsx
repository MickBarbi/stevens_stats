"use client";

// Split out of ProgressionClient.tsx so Recharts — the biggest chunk of this
// page's JS, and a poor tree-shaker — loads only after the rest of the page
// (controls, headline delta, table) has already rendered.
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMark, markKind } from "@/lib/format";

// mirrors the shape in ProgressionClient.tsx (public/progression.json)
type YearBest = {
  y: number;
  m: number;
  id: number;
  n: string;
  d: string;
  l: string | null;
  r: number | null;
};

// step sizes that read cleanly on a T&F axis (mirrors the athlete/compare charts)
const NICE = [
  0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 15, 20, 30, 60, 120,
  300, 600,
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
  let step = NICE.find((s) => s >= (max - min) / target) ?? (max - min) / target;
  let lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if ((hi - lo) / step > 6) {
    const i = NICE.indexOf(step);
    if (i >= 0 && i + 1 < NICE.length) {
      step = NICE[i + 1];
      lo = Math.floor(min / step) * step;
      hi = Math.ceil(max / step) * step;
    }
  }
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { domain: [Number(lo.toFixed(6)), Number(hi.toFixed(6))], ticks };
};

export default function ProgressionChart({
  eventId,
  rows,
}: {
  eventId: number;
  rows: YearBest[];
}) {
  const kind = markKind(eventId);
  const first = rows[0];
  const last = rows[rows.length - 1];

  // a continuous year axis — years the event wasn't run (or a gap season)
  // show up as a real break in the line, not a misleadingly adjacent point
  const byYear = new Map(rows.map((r) => [r.y, r]));
  const chartData: { year: number; mark: number | null }[] = [];
  for (let y = first.y; y <= last.y; y++) {
    chartData.push({ year: y, mark: byYear.get(y)?.m ?? null });
  }

  const marks = rows.map((r) => r.m);
  const yd = niceDomain(Math.min(...marks), Math.max(...marks));

  const chartLabel =
    `Team best each season, ${first.y} to ${last.y}: ` +
    `${formatMark(first.m, kind)} in ${first.y}, ${formatMark(last.m, kind)} in ${last.y}.`;

  return (
    <div role="img" aria-label={chartLabel}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 18, right: 14, left: 0, bottom: 2 }}>
          <CartesianGrid stroke="rgb(140 140 140 / 0.14)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: "var(--fg-subtle)" }}
            tickLine={false}
            axisLine={{ stroke: "rgb(140 140 140 / 0.4)" }}
            minTickGap={16}
          />
          <YAxis
            domain={yd.domain}
            ticks={yd.ticks}
            tickFormatter={(v: number) => formatMark(v, kind)}
            tick={{ fontSize: 11, fill: "var(--fg-subtle)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            labelFormatter={(y) => `${y} season`}
            formatter={(v) => [
              v == null ? "not contested" : formatMark(Number(v), kind),
              "Team best",
            ]}
            contentStyle={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--fg)",
            }}
            labelStyle={{ color: "var(--fg-muted)" }}
          />
          <Line
            type="linear"
            dataKey="mark"
            stroke="var(--chart-line)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-line)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
