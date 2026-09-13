"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Medal,
  ChevronLeft,
  ChevronRight,
  LineChart,
  ArrowLeftRight,
} from "lucide-react";
import AthletePicker from "../AthletePicker";
import { alumniLabel, isFormerAthlete, type EventRankMap } from "@/lib/athlete";
import type {
  Athlete,
  PickerAthlete,
  ProgressionPerformance,
} from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import AthletePhoto from "@/components/ui/AthletePhoto";
import ShareButton from "@/components/ui/ShareButton";
import EmptyState from "@/components/ui/EmptyState";

// Recharts is the single biggest chunk of this page's JS and doesn't
// tree-shake well — load it only once the rest of the profile has rendered,
// instead of blocking on it up front.
const EventCharts = dynamic(() => import("./EventCharts"), {
  loading: () => (
    <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="h-[254px] animate-pulse rounded-card bg-surface" />
      ))}
    </div>
  ),
});

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
const deriveSpecialties = (prog: Perf[], ranks: EventRankMap): Specialty[] => {
  const byEvent = new Map<number, { name: string; count: number }>();
  for (const p of prog) {
    const e = byEvent.get(p.event_id);
    if (e) e.count += 1;
    else byEvent.set(p.event_id, { name: p.event_name, count: 1 });
  }
  const specs: Specialty[] = [];
  for (const [event_id, e] of byEvent) {
    const r = ranks[event_id];
    const evRanks = [r?.indoor, r?.outdoor].filter((x): x is number => x != null);
    specs.push({
      event_id,
      event_name: e.name,
      count: e.count,
      rank: evRanks.length ? Math.min(...evRanks) : null,
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

/** Tiny inline trend line — a mini of the full progression chart below, so it
 *  reads the same way: the raw mark on the y-axis. Running times trend down as
 *  they improve, jumps/throws trend up. */
const Sparkline = ({ points }: { points: number[] }) => {
  if (points.length < 2) return null;
  const w = 76;
  const h = 24;
  const pad = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  // larger value sits higher, matching a standard numeric y-axis
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);
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
  ranks,
  others,
  prev,
  next,
}: {
  athlete: Athlete;
  progression: Perf[];
  ranks: EventRankMap;
  others: PickerAthlete[];
  prev: PickerAthlete | null;
  next: PickerAthlete | null;
}) => {
  const bestsRows = buildBests(progression);
  const displayName = athlete.nickname ? athlete.nickname : athlete.first_name;
  const fullName = `${displayName} ${athlete.last_name}`;

  const specialties = deriveSpecialties(progression, ranks);
  const headline = specialties[0] ?? null;
  const headlinePB = headline
    ? progression.find((p) => p.event_id === headline.event_id && p.is_personal_best) ?? null
    : null;

  const rankOf = (season: "indoor" | "outdoor", eventId: number) =>
    ranks[eventId]?.[season] ?? null;

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
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/compare?a=${athlete.athlete_id}`}
                title="Compare with another athlete"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
              >
                <ArrowLeftRight className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Compare</span>
              </Link>
              <ShareButton title={`${fullName} — Stevens Stats`} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="chip">
              {isFormerAthlete(athlete)
                ? alumniLabel(athlete)
                : YEAR_LABEL[athlete.year] ?? `Year ${athlete.year}`}
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
                      <Sparkline points={spark} />
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
