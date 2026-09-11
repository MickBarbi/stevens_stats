"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarOff } from "lucide-react";
import type { EventInfo, Season } from "@/lib/data";
import { formatMark, markKind, type MarkKind } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

// public/progression.json — built by scripts/gen-progression.mjs
type YearBest = {
  y: number;
  m: number;
  id: number;
  n: string;
  d: string;
  l: string | null;
  r: number | null; // all-time team-list rank, or null
};
type ProgressionData = Record<string, YearBest[]>;

let cache: ProgressionData | null = null;
async function loadData(): Promise<ProgressionData> {
  if (cache) return cache;
  const res = await fetch("/progression.json");
  cache = await res.json();
  return cache!;
}

const seasonOptionsFor = (
  ev: EventInfo | undefined
): { value: Season; label: string }[] => {
  if (ev?.event_season === "Indoor") return [{ value: "indoor", label: "Indoor" }];
  if (ev?.event_season === "Outdoor") return [{ value: "outdoor", label: "Outdoor" }];
  return [
    { value: "indoor", label: "Indoor" },
    { value: "outdoor", label: "Outdoor" },
  ];
};

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

const formatDelta = (d: number, kind: MarkKind): string => {
  if (kind === "points") return `${Math.round(d)} pts`;
  if (kind === "distance") return `${d.toFixed(2)} m`;
  return `${d.toFixed(2)}s`;
};

function ProgressionChart({
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

export default function ProgressionClient({ events }: { events: EventInfo[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.event_id - b.event_id),
    [events]
  );
  const eventById = useMemo(
    () => new Map(events.map((e) => [e.event_id, e])),
    [events]
  );

  const paramEventId = Number(params.get("event"));
  const [eventId, setEventId] = useState<number>(
    eventById.has(paramEventId) ? paramEventId : 6 // 800 Meters — deep history, both seasons
  );
  const [gender, setGender] = useState<"m" | "f">(
    params.get("gender") === "f" ? "f" : "m"
  );
  const [season, setSeason] = useState<Season>(() => {
    const opts = seasonOptionsFor(eventById.get(eventId));
    const p = params.get("season");
    return (p === "indoor" || p === "outdoor") && opts.some((o) => o.value === p)
      ? p
      : opts[0].value;
  });

  const [data, setData] = useState<ProgressionData | null>(null);
  useEffect(() => {
    loadData().then(setData);
  }, []);

  // keep the URL shareable
  useEffect(() => {
    const q = new URLSearchParams({ event: String(eventId), gender, season });
    router.replace(`/events/progression?${q}`, { scroll: false });
  }, [eventId, gender, season, router]);

  const changeEvent = (id: number) => {
    setEventId(id);
    const opts = seasonOptionsFor(eventById.get(id));
    if (!opts.some((o) => o.value === season)) setSeason(opts[0].value);
  };

  const ev = eventById.get(eventId);
  const seasonOpts = seasonOptionsFor(ev);
  const key = `${eventId}|${gender}|${season}`;
  const rows = data?.[key] ?? [];
  const kind = markKind(eventId);

  return (
    <div>
      <PageHeader title="Team Progression">
        <select
          value={eventId}
          onChange={(e) => changeEvent(Number(e.target.value))}
          aria-label="Event"
          className="field-select"
        >
          {sortedEvents.map((e) => (
            <option key={e.event_id} value={e.event_id}>
              {e.event_name}
            </option>
          ))}
        </select>
        <Segmented
          label="Gender"
          value={gender}
          onChange={setGender}
          options={[
            { value: "m", label: "Men" },
            { value: "f", label: "Women" },
          ]}
        />
        <Segmented
          label="Season"
          value={season}
          onChange={setSeason}
          options={seasonOpts}
        />
      </PageHeader>

      <p className="-mt-3 mb-6 text-sm text-fg-muted">
        The team&apos;s best mark in {ev?.event_name ?? "this event"} each{" "}
        {season} season — {gender === "m" ? "men's" : "women's"} team.
      </p>

      {!data ? (
        <p className="py-8 text-center text-sm text-fg-subtle">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No history for this split yet">
          Try a different event, gender, or season.
        </EmptyState>
      ) : (
        <Card className="p-4 sm:p-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="section-title text-brand">{ev!.event_name}</h2>
            {rows.length >= 2 && (
              <span className="font-mono text-sm font-semibold text-pb">
                {(ev!.higher_is_better
                  ? rows[rows.length - 1].m > rows[0].m
                  : rows[rows.length - 1].m < rows[0].m)
                  ? "▲"
                  : "▼"}{" "}
                {formatDelta(Math.abs(rows[rows.length - 1].m - rows[0].m), kind)}
                <span className="font-sans font-normal text-fg-muted">
                  {" · "}
                  {rows.length} seasons
                </span>
              </span>
            )}
          </div>

          {rows.length >= 2 ? (
            <ProgressionChart eventId={eventId} rows={rows} />
          ) : (
            <p className="py-6 text-center text-sm text-fg-subtle">
              Only one season on record for this split — not enough for a trend
              yet.
            </p>
          )}

          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border">
            {[...rows]
              .reverse()
              .map((r) => (
                <li
                  key={r.y}
                  className="flex items-baseline gap-3 px-4 py-2.5"
                >
                  <span className="w-10 shrink-0 font-mono text-sm text-fg-subtle">
                    {r.y}
                  </span>
                  <Link
                    href={`/athlete/${r.id}`}
                    className="min-w-0 flex-1 truncate font-medium text-fg hover:text-link"
                  >
                    {r.n}
                  </Link>
                  {r.r === 1 ? (
                    <Badge kind="sr" />
                  ) : r.r != null && r.r <= 10 ? (
                    <span
                      title={`#${r.r} all-time`}
                      className="shrink-0 rounded-full border border-current px-1.5 text-[0.6rem] font-bold leading-4 text-brand"
                    >
                      #{r.r}
                    </span>
                  ) : null}
                  <span className="shrink-0 font-mono font-semibold tabular-nums text-fg">
                    {r.l ? (
                      <a
                        href={r.l}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fg no-underline hover:text-brand hover:underline"
                      >
                        {formatMark(r.m, kind)}
                      </a>
                    ) : (
                      formatMark(r.m, kind)
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
