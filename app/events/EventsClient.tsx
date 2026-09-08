"use client";

import React, { useMemo, useState } from "react";
import type {
  BestCell,
  LeaderboardEvent,
  LeaderboardRow,
  QualifyingStandard,
  Season,
} from "@/lib/data";
import { formatMark, markKind, type MarkKind } from "@/lib/format";

type SeasonFilter = Season | "all";

type SortKey =
  | "name"
  | "indoor"
  | "outdoor"
  | "collegiate"
  | "personal"
  | "rank_indoor"
  | "rank_outdoor";

const cellMark = (c: BestCell) => (c ? Number(c.mark) : null);
const cellRank = (c: BestCell) => (c ? c.ranking : null);

const clears = (mark: number, standard: number, higherIsBetter: boolean) =>
  higherIsBetter ? mark >= standard : mark <= standard;

const EventsClient = ({
  events,
  standards,
  defaultSeason,
}: {
  events: LeaderboardEvent[];
  standards: QualifyingStandard[];
  defaultSeason: Season;
}) => {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<SeasonFilter>(defaultSeason);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  } | null>(null);

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

  const standardsFor = (eventId: number, season: string): Record<string, QualifyingStandard> =>
    stdMap.get(eventId)?.get(season) ?? {};

  const sortValue = (row: LeaderboardRow, key: SortKey): string | number | null => {
    switch (key) {
      case "name":
        return row.last_name.toLowerCase();
      case "indoor":
        return cellMark(row.indoor_best);
      case "outdoor":
        return cellMark(row.outdoor_best);
      case "collegiate":
        return cellMark(row.collegiate_best);
      case "personal":
        return cellMark(row.personal_best);
      case "rank_indoor":
        return cellRank(row.indoor_best);
      case "rank_outdoor":
        return cellRank(row.outdoor_best);
    }
  };

  const sortRows = (rows: LeaderboardRow[]) => {
    if (!sortConfig) return rows;
    const { key, direction } = sortConfig;
    const dir = direction === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av === bv) return 0;
      if (av === null || av === "") return 1; // nulls always last
      if (bv === null || bv === "") return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return dir * av.localeCompare(bv);
      }
      return dir * (Number(av) - Number(bv));
    });
  };

  const requestSort = (key: SortKey) =>
    setSortConfig((prev) =>
      prev && prev.key === key
        ? { key, direction: prev.direction === "ascending" ? "descending" : "ascending" }
        : { key, direction: "ascending" }
    );

  const sortIndicator = (key: SortKey) =>
    sortConfig?.key === key ? (sortConfig.direction === "ascending" ? " ▲" : " ▼") : "";

  const visibleEvents = events.filter((e) => {
    if (selectedEvent !== "" && e.event_name !== selectedEvent) return false;
    if (selectedSex !== "" && !e.rows.some((r) => r.sex === selectedSex)) return false;
    if (selectedSeason === "indoor" && e.event_season === "Outdoor") return false;
    if (selectedSeason === "outdoor" && e.event_season === "Indoor") return false;
    return true;
  });

  const markCell = (c: BestCell, kind: MarkKind) => (
    <a href={c?.result_link ?? undefined} target="_blank" rel="noopener noreferrer">
      {formatMark(c ? c.mark : "-", kind)}
    </a>
  );

  // Name colour: blue if the athlete's best for this event+season clears the
  // AARTFC standard, red if it clears the MAC standard, default otherwise.
  const nameClass = (event: LeaderboardEvent, row: LeaderboardRow): string => {
    if (selectedSeason === "all" || !row.sex) return "";
    const std = standardsFor(event.event_id, selectedSeason)[row.sex];
    if (!std) return "";
    const best = selectedSeason === "indoor" ? row.indoor_best : row.outdoor_best;
    if (!best) return "";
    const mark = Number(best.mark);
    const { aartfc_qualifying_standard: aartfc, mac_qualifying_standard: mac } = std;
    if (aartfc != null && clears(mark, Number(aartfc), event.higher_is_better))
      return "qualified-aartfc";
    if (mac != null && clears(mark, Number(mac), event.higher_is_better)) return "qualified-mac";
    return "";
  };

  const StandardLines = ({ event, kind }: { event: LeaderboardEvent; kind: MarkKind }) => {
    if (selectedSeason === "all") return null;
    const bySex = standardsFor(event.event_id, selectedSeason);
    const genders = (["m", "f"] as const).filter((g) => bySex[g]);
    if (genders.length === 0) return null;

    return (
      <div className="qualifying-standards">
        {genders.map((g) => {
          const std = bySex[g];
          const label = g === "m" ? "Men" : "Women";
          const notContested =
            std.mac_qualifying_standard == null && std.aartfc_qualifying_standard == null;
          if (notContested) {
            return (
              <p key={g}>
                <em>
                  {label}: not contested at MAC / AARTFC ({selectedSeason})
                </em>
              </p>
            );
          }
          return (
            <p key={g}>
              {label} —{" "}
              <span className="mac-standard">
                MAC{" "}
                {std.mac_qualifying_standard != null
                  ? formatMark(std.mac_qualifying_standard, kind)
                  : "—"}
              </span>
              {"   "}
              <span className="aartfc-standard">
                AARTFC{" "}
                {std.aartfc_qualifying_standard != null
                  ? formatMark(std.aartfc_qualifying_standard, kind)
                  : "—"}
              </span>
            </p>
          );
        })}
      </div>
    );
  };

  const oneSeason = selectedSeason !== "all";
  const bestKey: SortKey = selectedSeason === "outdoor" ? "outdoor" : "indoor";
  const rankKey: SortKey = selectedSeason === "outdoor" ? "rank_outdoor" : "rank_indoor";

  return (
    <div className="px-6">
      <h1 className="beginning">Events Page</h1>

      <select onChange={(e) => setSelectedEvent(e.target.value)} value={selectedEvent}>
        <option value="">All Events</option>
        {events.map((e) => (
          <option key={e.event_id} value={e.event_name}>
            {e.event_name}
          </option>
        ))}
      </select>

      <select onChange={(e) => setSelectedSex(e.target.value)} value={selectedSex}>
        <option value="">All Genders</option>
        <option value="m">Men</option>
        <option value="f">Women</option>
      </select>

      <select
        onChange={(e) => setSelectedSeason(e.target.value as SeasonFilter)}
        value={selectedSeason}
      >
        <option value="indoor">Indoor</option>
        <option value="outdoor">Outdoor</option>
        <option value="all">All Seasons</option>
      </select>

      {visibleEvents.map((event) => {
        const kind = markKind(event.event_id);
        const rows = sortRows(
          event.rows.filter((r) => selectedSex === "" || r.sex === selectedSex)
        );
        const seasonCell = (r: LeaderboardRow) =>
          selectedSeason === "outdoor" ? r.outdoor_best : r.indoor_best;

        return (
          <div key={event.event_id}>
            <h1>{event.event_name}</h1>
            <StandardLines event={event} kind={kind} />
            <table>
              <thead>
                <tr>
                  <th onClick={() => requestSort("name")}>Athlete Name{sortIndicator("name")}</th>
                  {oneSeason ? (
                    <th onClick={() => requestSort(bestKey)}>
                      {selectedSeason === "outdoor" ? "Outdoor" : "Indoor"} Best
                      {sortIndicator(bestKey)}
                    </th>
                  ) : (
                    <>
                      <th onClick={() => requestSort("indoor")}>
                        Indoor Best{sortIndicator("indoor")}
                      </th>
                      <th onClick={() => requestSort("outdoor")}>
                        Outdoor Best{sortIndicator("outdoor")}
                      </th>
                    </>
                  )}
                  <th onClick={() => requestSort("collegiate")}>
                    Collegiate Best{sortIndicator("collegiate")}
                  </th>
                  <th onClick={() => requestSort("personal")}>
                    Personal Best{sortIndicator("personal")}
                  </th>
                  {oneSeason ? (
                    <th onClick={() => requestSort(rankKey)}>
                      Ranking{sortIndicator(rankKey)}
                    </th>
                  ) : (
                    <>
                      <th onClick={() => requestSort("rank_indoor")}>
                        Indoor Ranking{sortIndicator("rank_indoor")}
                      </th>
                      <th onClick={() => requestSort("rank_outdoor")}>
                        Outdoor Ranking{sortIndicator("rank_outdoor")}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.athlete_id}>
                    <td>
                      <b className={nameClass(event, row)}>
                        {row.nickname ? row.nickname : row.first_name} {row.last_name}
                      </b>
                    </td>
                    {oneSeason ? (
                      <td>{markCell(seasonCell(row), kind)}</td>
                    ) : (
                      <>
                        <td>{markCell(row.indoor_best, kind)}</td>
                        <td>{markCell(row.outdoor_best, kind)}</td>
                      </>
                    )}
                    <td>{markCell(row.collegiate_best, kind)}</td>
                    <td>{markCell(row.personal_best, kind)}</td>
                    {oneSeason ? (
                      <td>{seasonCell(row)?.ranking ?? "-"}</td>
                    ) : (
                      <>
                        <td>{row.indoor_best?.ranking ?? "-"}</td>
                        <td>{row.outdoor_best?.ranking ?? "-"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default EventsClient;
