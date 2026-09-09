"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  teamRank,
  type BestCell,
  type LeaderboardEvent,
  type LeaderboardRow,
  type QualifyingStandard,
  type Season,
} from "@/lib/data";
import { formatMark, markKind, type MarkKind } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";

type SexFilter = "" | "m" | "f";
type SortKey = "rank" | "name";
type Scope = "season" | "alltime";

const num = (c: BestCell) => (c ? Number(c.mark) : null);

const clears = (mark: number, standard: number, higherIsBetter: boolean) =>
  higherIsBetter ? mark >= standard : mark <= standard;

// true once the viewport is at least `px` wide (SSR-safe: starts false)
function useMinWidth(px: number) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${px}px)`);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return matches;
}

// --- small building blocks --------------------------------------------------

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

const MarkStat = ({
  label,
  cell,
  kind,
  muted,
  className = "",
}: {
  label?: string;
  cell: BestCell;
  kind: MarkKind;
  muted?: boolean;
  className?: string;
}) => (
  <span
    className={`font-mono text-sm tabular-nums ${muted ? "text-fg-muted" : "text-fg"} ${className}`}
  >
    {label && <span className="font-sans text-xs text-fg-subtle">{label} </span>}
    {cell?.result_link ? (
      <a
        href={cell.result_link}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        {formatMark(cell.mark, kind)}
      </a>
    ) : cell ? (
      formatMark(cell.mark, kind)
    ) : (
      "—"
    )}
  </span>
);

const CutLine = ({ label, tone }: { label: string; tone: "mac" | "aartfc" }) => (
  <li aria-hidden className="flex items-center gap-2 px-2 py-1">
    <span className={`h-px flex-1 ${tone === "aartfc" ? "bg-aartfc" : "bg-mac"}`} />
    <span
      className={`text-[0.65rem] font-bold uppercase tracking-wide ${
        tone === "aartfc" ? "text-aartfc" : "text-mac"
      }`}
    >
      {label} cut
    </span>
    <span className={`h-px flex-1 ${tone === "aartfc" ? "bg-aartfc" : "bg-mac"}`} />
  </li>
);

// --- page -----------------------------------------------------------------

const EventsClient = ({
  events,
  standards,
  defaultSeason,
}: {
  events: LeaderboardEvent[];
  standards: QualifyingStandard[];
  defaultSeason: Season;
}) => {
  const [season, setSeason] = useState<Season>(defaultSeason);
  const [scope, setScope] = useState<Scope>("season");
  const [sex, setSex] = useState<SexFilter>("");
  const [sort, setSort] = useState<SortKey>("rank");

  // event_id -> season -> gender -> standard
  const stdMap = useMemo(() => {
    const m = new Map<number, Map<string, Record<string, QualifyingStandard>>>();
    for (const s of standards) {
      if (!m.has(s.event_id)) m.set(s.event_id, new Map());
      const bySeason = m.get(s.event_id)!;
      if (!bySeason.has(s.season)) bySeason.set(s.season, {});
      bySeason.get(s.season)![s.gender] = s;
    }
    return m;
  }, [standards]);

  const standardFor = (eventId: number, s: string, g: string): QualifyingStandard | null =>
    stdMap.get(eventId)?.get(s)?.[g] ?? null;

  // the mark to rank / headline by: this-season best or all-time best, for the
  // chosen season half. Relays / mixed lists aren't in play here.
  const bestOf = (r: LeaderboardRow): BestCell => {
    if (season === "indoor")
      return scope === "season" ? r.indoor_season_best : r.indoor_best;
    return scope === "season" ? r.outdoor_season_best : r.outdoor_best;
  };

  // an event shows only if someone has a mark to rank under the current filters
  const hasRow = (r: LeaderboardRow) => (sex === "" || r.sex === sex) && bestOf(r) != null;

  const visibleEvents = events.filter((e) => {
    if (season === "indoor" && e.event_season === "Outdoor") return false;
    if (season === "outdoor" && e.event_season === "Indoor") return false;
    return e.rows.some(hasRow);
  });

  const scrollTo = (id: number) =>
    document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Deal events alternately into two columns on wide screens so reading order is
  // across-then-down (60 · 200 / 400 · 800 …), not down-one-column-then-the-next.
  const twoCol = useMinWidth(1080);
  const columns = twoCol
    ? [
        visibleEvents.filter((_, i) => i % 2 === 0),
        visibleEvents.filter((_, i) => i % 2 === 1),
      ]
    : [visibleEvents];

  return (
    <div>
      <PageHeader title="Events">
        <Segmented
          label="Season"
          value={season}
          onChange={setSeason}
          options={[
            { value: "indoor", label: "Indoor" },
            { value: "outdoor", label: "Outdoor" },
          ]}
        />
        <Segmented
          label="Range"
          value={scope}
          onChange={setScope}
          options={[
            { value: "season", label: "This season" },
            { value: "alltime", label: "All-time" },
          ]}
        />
        <Segmented
          label="Gender"
          value={sex}
          onChange={setSex}
          options={[
            { value: "", label: "All" },
            { value: "m", label: "Men" },
            { value: "f", label: "Women" },
          ]}
        />
        <Segmented
          label="Sort"
          value={sort}
          onChange={setSort}
          options={[
            { value: "rank", label: "By rank" },
            { value: "name", label: "A–Z" },
          ]}
        />
      </PageHeader>

      {/* jump-to-event bar — sticks just under the app header */}
      <nav
        aria-label="Jump to event"
        className="sticky top-[87px] z-30 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-y border-border bg-bg px-4 py-2 sm:mx-0 sm:rounded-lg sm:border"
      >
        {visibleEvents.map((e) => (
          <button
            key={e.event_id}
            type="button"
            onClick={() => scrollTo(e.event_id)}
            className="chip shrink-0 whitespace-nowrap hover:border-link hover:text-fg"
          >
            {e.event_name}
          </button>
        ))}
      </nav>

      {/* one column on narrow screens; two interleaved columns on wide ones */}
      <div
        className={
          twoCol ? "mx-auto flex max-w-[1120px] items-start gap-6" : "mx-auto max-w-lg"
        }
      >
        {columns.map((col, ci) => (
          <div key={ci} className="min-w-0 flex-1 space-y-5">
            {col.map((event) => {
          const kind = markKind(event.event_id);
          const hib = event.higher_is_better;

          const rows = event.rows
            .filter(hasRow)
            .sort((a, b) => {
              if (sort === "name")
                return (
                  a.last_name.localeCompare(b.last_name) ||
                  a.first_name.localeCompare(b.first_name)
                );
              return hib
                ? num(bestOf(b))! - num(bestOf(a))!
                : num(bestOf(a))! - num(bestOf(b))!;
            });

          // A cut line only makes sense ranked and against one gender's standard.
          const std = sex !== "" ? standardFor(event.event_id, season, sex) : null;
          const aartfc = std?.aartfc_qualifying_standard ?? null;
          const mac = std?.mac_qualifying_standard ?? null;
          const notContested = std != null && aartfc == null && mac == null;

          const lastClearing = (val: number | null): number => {
            if (val == null || sort !== "rank") return -1;
            let i = -1;
            rows.forEach((r, idx) => {
              const m = num(bestOf(r));
              if (m != null && clears(m, val, hib)) i = idx;
            });
            return i < rows.length - 1 ? i : -1; // no line dangling at the bottom
          };
          const aartfcIdx = lastClearing(aartfc != null ? Number(aartfc) : null);
          const macIdx = lastClearing(mac != null ? Number(mac) : null);

          const nameClass = (best: BestCell): string => {
            if (!best) return "";
            const m = Number(best.mark);
            if (aartfc != null && clears(m, Number(aartfc), hib)) return "text-aartfc";
            if (mac != null && clears(m, Number(mac), hib)) return "text-mac";
            return "";
          };

          return (
            <section
              key={event.event_id}
              id={`ev-${event.event_id}`}
              className="scroll-mt-[144px]"
            >
              <div className="card p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="section-title text-brand">{event.event_name}</h2>
                  <span className="text-xs uppercase tracking-wide text-fg-subtle">
                    {season === "indoor" ? "Indoor" : "Outdoor"}
                    {" · "}
                    {scope === "season" ? "this season" : "all-time"}
                  </span>
                </div>

                {std && (
                  <p className="mb-3 text-sm text-fg-muted">
                    {notContested ? (
                      <em>Not contested at MAC / AARTFC ({season}).</em>
                    ) : (
                      <>
                        Qualifying:{" "}
                        {mac != null && (
                          <span className="font-medium text-mac">
                            MAC {formatMark(mac, kind)}
                          </span>
                        )}
                        {mac != null && aartfc != null && " · "}
                        {aartfc != null && (
                          <span className="font-medium text-aartfc">
                            AARTFC {formatMark(aartfc, kind)}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                )}

                {rows.length === 0 ? (
                  <p className="py-1 text-sm text-fg-muted">No marks yet.</p>
                ) : (
                  <ol className="-mx-2">
                    {rows.map((row, idx) => {
                      const best = bestOf(row);
                      const tr = teamRank(row.athlete_id, event.event_id, season, row.sex);
                      return (
                        <React.Fragment key={row.athlete_id}>
                          <li className="grid grid-cols-[1.5rem_1fr] items-baseline gap-x-2 gap-y-1 rounded-md px-2 py-1.5 odd:bg-surface sm:grid-cols-[1.5rem_13rem_1fr] sm:gap-x-3">
                            <span className="text-right text-sm tabular-nums text-fg-subtle">
                              {sort === "rank" ? idx + 1 : ""}
                            </span>
                            <a
                              href={`/athlete/${row.athlete_id}`}
                              title={`${row.first_name} ${row.last_name}`}
                              className={`truncate font-medium hover:text-link ${nameClass(best)}`}
                            >
                              {row.nickname ? row.nickname : row.first_name} {row.last_name}
                            </a>
                            {/* marks group — indented under the name on mobile,
                                its own column on desktop. The primary mark has a
                                fixed width so every row's mark aligns. */}
                            <div className="col-start-2 flex items-baseline gap-x-3 whitespace-nowrap sm:col-start-3">
                              <MarkStat
                                cell={best}
                                kind={kind}
                                className="inline-block w-[4.5rem] shrink-0 text-right"
                              />
                              {best &&
                                row.personal_best &&
                                formatMark(row.personal_best.mark, kind) !==
                                  formatMark(best.mark, kind) && (
                                  <MarkStat
                                    label="PB"
                                    cell={row.personal_best}
                                    kind={kind}
                                    muted
                                  />
                                )}
                              {tr != null && (
                                <span
                                  title={`#${tr} on the all-time team list`}
                                  className={`font-mono text-sm ${
                                    tr === 1 ? "font-semibold text-brand" : "text-fg-subtle"
                                  }`}
                                >
                                  #{tr}
                                </span>
                              )}
                            </div>
                          </li>
                          {idx === aartfcIdx && idx !== macIdx && (
                            <CutLine
                              tone="aartfc"
                              label={`AARTFC ${formatMark(Number(aartfc), kind)}`}
                            />
                          )}
                          {idx === macIdx && (
                            <CutLine tone="mac" label={`MAC ${formatMark(Number(mac), kind)}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ol>
                )}
              </div>
            </section>
          );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsClient;
