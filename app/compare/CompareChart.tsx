"use client";

// Split out of CompareClient.tsx so Recharts — the biggest chunk of this
// page's JS, and a poor tree-shaker — loads only once the picked athletes'
// own summary cards have already rendered, via next/dynamic in CompareClient.
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMark, markKind } from "@/lib/format";

const SIDE = [
  { key: "a", color: "var(--brand)", dot: "bg-brand" },
  { key: "b", color: "var(--link)", dot: "bg-[color:var(--link)]" },
] as const;

// rounded [min,max] + tick list that reads cleanly on a T&F axis
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

const monthTicks = (tsMin: number, tsMax: number): number[] => {
  const months = (tsMax - tsMin) / (1000 * 60 * 60 * 24 * 30.44);
  const stepMonths = months <= 6 ? 1 : months <= 14 ? 3 : months <= 30 ? 6 : 12;
  const out: number[] = [];
  const cur = new Date(new Date(tsMin).getFullYear(), new Date(tsMin).getMonth(), 1);
  const hi = new Date(tsMax);
  const end = new Date(hi.getFullYear(), hi.getMonth() + 1, 0).getTime();
  while (cur.getTime() <= end) {
    const t = cur.getTime();
    if (t >= tsMin && t <= tsMax) out.push(t);
    cur.setMonth(cur.getMonth() + stepMonths);
  }
  return out.length >= 2 ? out : [tsMin, tsMax];
};

export default function CompareChart({
  eventId,
  eventName,
  a,
  b,
  names,
}: {
  eventId: number;
  eventName: string;
  a: [string, number][] | null;
  b: [string, number][] | null;
  names: [string, string];
}) {
  const kind = markKind(eventId);

  // A side needs 2+ improvements to draw a trend line; a side with a single
  // mark gets a dashed reference line at that mark instead of a lonely dot.
  const aLine = (a?.length ?? 0) >= 2;
  const bLine = (b?.length ?? 0) >= 2;
  const aRef = !aLine && a && a.length ? a[a.length - 1][1] : null;
  const bRef = !bLine && b && b.length ? b[b.length - 1][1] : null;

  const merged = useMemo(() => {
    const m = new Map<number, { ts: number; a?: number; b?: number }>();
    const add = (pts: [string, number][] | null, key: "a" | "b") => {
      for (const [d, v] of pts ?? []) {
        const ts = new Date(d + "T00:00:00").getTime();
        const row = m.get(ts) ?? { ts };
        row[key] = v;
        m.set(ts, row);
      }
    };
    if (aLine) add(a, "a");
    if (bLine) add(b, "b");
    return [...m.values()].sort((x, y) => x.ts - y.ts);
  }, [a, b, aLine, bLine]);

  // nothing to plot unless at least one side has a real trend line
  if (!aLine && !bLine) return null;

  const marks = [
    ...merged.flatMap((r) => [r.a, r.b].filter((v): v is number => v != null)),
    ...(aRef != null ? [aRef] : []),
    ...(bRef != null ? [bRef] : []),
  ];
  const yd = niceDomain(Math.min(...marks), Math.max(...marks));
  const tsMin = merged[0].ts;
  const tsMax = merged[merged.length - 1].ts;
  const spanDays = (tsMax - tsMin) / 86_400_000;

  const best = (pts: [string, number][] | null) =>
    pts && pts.length ? formatMark(pts[pts.length - 1][1], kind) : "no mark";
  const chartLabel =
    `${eventName} best-mark progression. ` +
    `${names[0]}: best ${best(a)}. ${names[1]}: best ${best(b)}.`;

  return (
    <div role="img" aria-label={chartLabel}>
     <ResponsiveContainer width="100%" height={190}>
      <LineChart data={merged} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgb(140 140 140 / 0.14)" vertical={false} />
        <XAxis
          type="number"
          dataKey="ts"
          domain={[tsMin, tsMax]}
          ticks={monthTicks(tsMin, tsMax)}
          tickFormatter={(ms: number) => {
            const d = new Date(ms);
            const mo = d.toLocaleDateString(undefined, { month: "short" });
            return spanDays < 120
              ? mo
              : `${mo} ’${String(d.getFullYear()).slice(-2)}`;
          }}
          tick={{ fontSize: 11, fill: "var(--fg-subtle)" }}
          tickLine={false}
          axisLine={{ stroke: "rgb(140 140 140 / 0.4)" }}
          minTickGap={16}
        />
        <YAxis
          type="number"
          domain={yd.domain}
          ticks={yd.ticks}
          tickFormatter={(v: number) => formatMark(v, kind)}
          tick={{ fontSize: 11, fill: "var(--fg-subtle)" }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          labelFormatter={(ms) =>
            new Date(Number(ms)).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }
          formatter={(v: number, seriesName) => [
            formatMark(v, kind),
            seriesName,
          ]}
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--fg)",
          }}
          labelStyle={{ color: "var(--fg-muted)" }}
        />
        {aRef != null && (
          <ReferenceLine
            y={aRef}
            stroke={SIDE[0].color}
            strokeDasharray="4 4"
            label={{
              value: `${names[0]} ${formatMark(aRef, kind)}`,
              position: "insideTopLeft",
              fontSize: 11,
              fill: SIDE[0].color,
            }}
          />
        )}
        {bRef != null && (
          <ReferenceLine
            y={bRef}
            stroke={SIDE[1].color}
            strokeDasharray="4 4"
            label={{
              value: `${names[1]} ${formatMark(bRef, kind)}`,
              position: "insideBottomLeft",
              fontSize: 11,
              fill: SIDE[1].color,
            }}
          />
        )}
        {aLine && (
          <Line
            type="linear"
            dataKey="a"
            stroke={SIDE[0].color}
            strokeWidth={2}
            dot={{ r: 3, fill: SIDE[0].color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
            name={names[0]}
          />
        )}
        {bLine && (
          <Line
            type="linear"
            dataKey="b"
            stroke={SIDE[1].color}
            strokeWidth={2}
            dot={{ r: 3, fill: SIDE[1].color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
            name={names[1]}
          />
        )}
      </LineChart>
     </ResponsiveContainer>
    </div>
  );
}
