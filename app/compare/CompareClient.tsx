"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { ArrowLeftRight, ChevronsUpDown, Search, X } from "lucide-react";
import type { PickerAthlete } from "@/lib/data";
import { isFormerAthlete } from "@/lib/athlete";
import { formatMark, markKind } from "@/lib/format";
import AthletePhoto from "@/components/ui/AthletePhoto";
import Card from "@/components/ui/Card";

// ---- data shapes (public/compare-data.json, built by gen-compare-data.mjs) ---
type EvRow = {
  e: number; // event_id
  s: "i" | "o"; // season
  pb: number;
  d: string; // PB date (YYYY-MM-DD)
  r: number | null; // all-time team rank
  p: [string, number][]; // monotonic best-mark progression: [date, mark]
};
type Row = {
  id: number;
  n: string;
  x: "m" | "f" | null;
  alt?: string;
  f?: 1; // former athlete
  gy?: number; // graduation year
  st?: string; // status
  ev: EvRow[];
};
type EventMeta = Record<number, { name: string; hib: boolean }>;

const SIDE = [
  { key: "a", color: "var(--brand)", dot: "bg-brand" },
  { key: "b", color: "var(--link)", dot: "bg-[color:var(--link)]" },
] as const;

// ---- helpers ---------------------------------------------------------------

const numOrNull = (s: string | null): number | null => {
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
};

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const seasonLabel = (s: "i" | "o") => (s === "i" ? "Indoor" : "Outdoor");

// the size of a PB gap, in the event's own unit
const deltaText = (d: number, kind: ReturnType<typeof markKind>) => {
  if (kind === "points") return `${Math.round(d)} pts`;
  if (kind === "distance") return `${d.toFixed(2)} m`;
  return `${d.toFixed(2)} s`;
};

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

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

const standing = (r: Row): string => {
  if (!r.f) return "Current athlete";
  if (r.st === "transferred") return "Transferred";
  if (r.gy) return `Class of '${String(r.gy).slice(-2)}`;
  return "Alum";
};

// ---- athlete picker ------------------------------------------------------

function AthleteCombobox({
  athletes,
  value,
  exclude,
  onChange,
  placeholder,
}: {
  athletes: PickerAthlete[];
  value: PickerAthlete | null;
  exclude: number | null;
  onChange: (a: PickerAthlete | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const label = (a: PickerAthlete) =>
    `${a.nickname ? a.nickname : a.first_name} ${a.last_name}`;

  const options = useMemo(() => {
    const q = fold(query.trim());
    const pool = athletes.filter((a) => a.athlete_id !== exclude);
    if (!q) return pool.slice(0, 8);
    return pool
      .filter((a) => fold(`${a.first_name} ${a.nickname ?? ""} ${a.last_name}`).includes(q))
      .slice(0, 8);
  }, [athletes, query, exclude]);

  return (
    <Combobox
      value={value}
      onChange={(a: PickerAthlete | null) => {
        onChange(a);
        setQuery("");
      }}
    >
      <div className="relative">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-link">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          <ComboboxInput
            className="w-full bg-transparent py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            placeholder={placeholder}
            displayValue={(a: PickerAthlete | null) => (a ? label(a) : "")}
            onChange={(e) => setQuery(e.target.value)}
          />
          {value ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => onChange(null)}
              className="shrink-0 rounded p-0.5 text-fg-subtle hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          )}
        </div>
        <ComboboxOptions className="card absolute z-20 mt-1 max-h-72 w-full overflow-y-auto p-1.5">
          {options.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-fg-subtle">
              No athletes found
            </p>
          ) : (
            options.map((a) => (
              <ComboboxOption
                key={a.athlete_id}
                value={a}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm data-[focus]:bg-surface"
              >
                <span className="truncate text-fg">{label(a)}</span>
                {isFormerAthlete(a) && (
                  <span className="shrink-0 rounded-full border border-border px-1.5 text-[0.6rem] font-semibold uppercase leading-4 text-fg-subtle">
                    alum
                  </span>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}

// ---- comparison chart ---------------------------------------------------

function CompareChart({
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

// ---- summary card for a picked athlete ---------------------------------

function AthleteHeader({
  picker,
  row,
  eventMeta,
}: {
  picker: PickerAthlete;
  row: Row | undefined;
  eventMeta: EventMeta;
}) {
  const name = `${picker.nickname ? picker.nickname : picker.first_name} ${picker.last_name}`;

  // headline = best rank, else most progression points, else lowest event id
  const headline = useMemo(() => {
    if (!row || row.ev.length === 0) return null;
    return [...row.ev].sort(
      (x, y) =>
        (x.r ?? 99) - (y.r ?? 99) ||
        y.p.length - x.p.length ||
        x.e - y.e
    )[0];
  }, [row]);

  return (
    <Card className="flex items-start gap-4 p-4">
      <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md border border-border">
        <AthletePhoto athlete={picker} sizes="80px" />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/athlete/${picker.athlete_id}`}
          className="font-semibold text-fg hover:text-link"
        >
          {name}
        </Link>
        <p className="mt-0.5 text-sm text-fg-muted">
          {row
            ? standing(row)
            : isFormerAthlete(picker)
              ? "Alum"
              : "Current athlete"}
          {row?.x && ` · ${row.x === "m" ? "Men's" : "Women's"}`}
        </p>
        {headline && (
          <p className="mt-2 text-sm">
            <span className="font-medium text-fg">
              {eventMeta[headline.e]?.name ?? headline.e}
            </span>{" "}
            <span className="font-mono tabular-nums text-fg-muted">
              {formatMark(headline.pb, markKind(headline.e))}
            </span>
            {headline.r != null && (
              <span
                className={
                  headline.r === 1
                    ? " font-semibold text-brand"
                    : " text-fg-subtle"
                }
              >
                {" · "}
                {headline.r === 1 ? "School Record" : `#${headline.r} all-time`}
              </span>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}

// ---- page --------------------------------------------------------------

export default function CompareClient({
  athletes,
  eventMeta,
}: {
  athletes: PickerAthlete[];
  eventMeta: EventMeta;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [data, setData] = useState<Row[] | null>(null);
  const [aId, setAId] = useState<number | null>(() => numOrNull(params.get("a")));
  const [bId, setBId] = useState<number | null>(() => numOrNull(params.get("b")));

  useEffect(() => {
    let live = true;
    fetch("/compare-data.json")
      .then((r) => r.json())
      .then((d: Row[]) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const pickerById = useMemo(
    () => new Map(athletes.map((a) => [a.athlete_id, a])),
    [athletes]
  );
  const rowById = useMemo(
    () => new Map((data ?? []).map((r) => [r.id, r])),
    [data]
  );

  const setPair = useCallback(
    (na: number | null, nb: number | null) => {
      setAId(na);
      setBId(nb);
      const q = new URLSearchParams();
      if (na) q.set("a", String(na));
      if (nb) q.set("b", String(nb));
      router.replace(q.toString() ? `/compare?${q}` : "/compare", {
        scroll: false,
      });
    },
    [router]
  );

  const aPick = aId != null ? pickerById.get(aId) ?? null : null;
  const bPick = bId != null ? pickerById.get(bId) ?? null : null;
  const aRow = aId != null ? rowById.get(aId) : undefined;
  const bRow = bId != null ? rowById.get(bId) : undefined;

  const names: [string, string] = [
    aPick ? `${aPick.nickname ?? aPick.first_name} ${aPick.last_name}` : "A",
    bPick ? `${bPick.nickname ?? bPick.first_name} ${bPick.last_name}` : "B",
  ];

  // shared vs unique events, keyed by `${event_id}|${season}`
  const { shared, onlyA, onlyB } = useMemo(() => {
    const key = (e: EvRow) => `${e.e}|${e.s}`;
    const aMap = new Map((aRow?.ev ?? []).map((e) => [key(e), e]));
    const bMap = new Map((bRow?.ev ?? []).map((e) => [key(e), e]));
    const shared: { a: EvRow; b: EvRow }[] = [];
    const onlyA: EvRow[] = [];
    const onlyB: EvRow[] = [];
    for (const [k, e] of aMap) {
      const be = bMap.get(k);
      if (be) shared.push({ a: e, b: be });
      else onlyA.push(e);
    }
    for (const [k, e] of bMap) if (!aMap.has(k)) onlyB.push(e);
    const ord = (e: EvRow) => e.e * 2 + (e.s === "i" ? 0 : 1);
    shared.sort((x, y) => ord(x.a) - ord(y.a));
    onlyA.sort((x, y) => ord(x) - ord(y));
    onlyB.sort((x, y) => ord(x) - ord(y));
    return { shared, onlyA, onlyB };
  }, [aRow, bRow]);

  const bothPicked = aPick && bPick;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Compare</h1>
        {bothPicked && (
          <button
            type="button"
            onClick={() => setPair(bId, aId)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-[color:var(--border-hover)] hover:text-fg"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
            Swap
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {([["a", aId, aPick], ["b", bId, bPick]] as const).map(
          ([side, id, pick]) => (
            <div key={side} className="space-y-3">
              <AthleteCombobox
                athletes={athletes}
                value={pick}
                exclude={side === "a" ? bId : aId}
                placeholder={side === "a" ? "First athlete…" : "Second athlete…"}
                onChange={(a) =>
                  side === "a"
                    ? setPair(a?.athlete_id ?? null, bId)
                    : setPair(aId, a?.athlete_id ?? null)
                }
              />
              {pick && (
                <div className="border-l-2 pl-3" style={{ borderColor: SIDE[side === "a" ? 0 : 1].color }}>
                  <AthleteHeader
                    picker={pick}
                    row={id != null ? rowById.get(id) : undefined}
                    eventMeta={eventMeta}
                  />
                </div>
              )}
            </div>
          )
        )}
      </div>

      {!bothPicked && (
        <p className="rounded-card border border-dashed border-border px-6 py-10 text-center text-sm text-fg-muted">
          {aPick || bPick
            ? "Pick a second athlete to see them side by side."
            : "Pick two athletes to compare their bests, ranks and progression."}
        </p>
      )}

      {bothPicked && data && (
        <>
          <section>
            <h2 className="section-title mb-4">
              Shared events{" "}
              <span className="text-base font-normal text-fg-subtle">
                ({shared.length})
              </span>
            </h2>
            {shared.length === 0 ? (
              <p className="rounded-card border border-dashed border-border px-6 py-8 text-center text-sm text-fg-muted">
                {names[0]} and {names[1]} have no events in common.
              </p>
            ) : (
              <div className="space-y-5">
                {shared.map(({ a, b }) => {
                  const kind = markKind(a.e);
                  const hib = eventMeta[a.e]?.hib ?? false;
                  const aBetter = hib ? a.pb > b.pb : a.pb < b.pb;
                  const diff = Math.abs(a.pb - b.pb);
                  return (
                    <Card key={`${a.e}|${a.s}`} className="p-4 sm:p-5">
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-fg">
                          {eventMeta[a.e]?.name ?? a.e}
                          <span className="font-normal text-fg-muted">
                            {" · "}
                            {seasonLabel(a.s)}
                          </span>
                        </h3>
                        {diff > 0 && (
                          <span className="text-xs text-fg-subtle">
                            {aBetter ? names[0] : names[1]} by{" "}
                            <span className="font-mono tabular-nums">
                              {deltaText(diff, kind)}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {[
                          { side: 0 as const, row: a },
                          { side: 1 as const, row: b },
                        ].map(({ side, row }) => {
                          const best =
                            side === 0 ? aBetter : !aBetter && diff > 0;
                          return (
                            <div
                              key={side}
                              className="flex items-baseline gap-2 text-sm"
                            >
                              <span
                                className={`h-2 w-2 shrink-0 self-center rounded-full ${SIDE[side].dot}`}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 truncate text-fg-muted">
                                {names[side]}
                              </span>
                              <span
                                className={`font-mono tabular-nums ${
                                  best ? "font-semibold text-fg" : "text-fg-muted"
                                }`}
                              >
                                {formatMark(row.pb, kind)}
                              </span>
                              <span className="w-14 shrink-0 text-right text-xs text-fg-subtle">
                                {row.r != null
                                  ? row.r === 1
                                    ? "SR"
                                    : `#${row.r}`
                                  : fmtDate(row.d)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3">
                        <CompareChart
                          eventId={a.e}
                          eventName={eventMeta[a.e]?.name ?? String(a.e)}
                          a={a.p}
                          b={b.p}
                          names={names}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {(onlyA.length > 0 || onlyB.length > 0) && (
            <section>
              <h2 className="section-title mb-4">Other events</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { side: 0 as const, list: onlyA, who: names[0] },
                  { side: 1 as const, list: onlyB, who: names[1] },
                ].map(({ side, list, who }) => (
                  <div key={side}>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      <span
                        className={`h-2 w-2 rounded-full ${SIDE[side].dot}`}
                        aria-hidden
                      />
                      Only {who}
                    </p>
                    {list.length === 0 ? (
                      <p className="text-sm text-fg-subtle">—</p>
                    ) : (
                      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-raised text-sm">
                        {list.map((e) => (
                          <li
                            key={`${e.e}|${e.s}`}
                            className="flex items-baseline justify-between gap-2 px-3 py-2"
                          >
                            <span className="min-w-0 truncate text-fg-muted">
                              {eventMeta[e.e]?.name ?? e.e}
                              <span className="text-fg-subtle">
                                {" · "}
                                {seasonLabel(e.s)}
                              </span>
                            </span>
                            <span className="shrink-0 font-mono tabular-nums text-fg">
                              {formatMark(e.pb, markKind(e.e))}
                              {e.r != null && (
                                <span className="ml-1.5 text-xs text-fg-subtle">
                                  {e.r === 1 ? "SR" : `#${e.r}`}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {bothPicked && !data && (
        <p className="text-center text-sm text-fg-subtle">Loading…</p>
      )}
    </div>
  );
}
