"use client";

import React, { useMemo, useState } from "react";
import type { BestCell, LeaderboardEvent, LeaderboardRow, QualifyingStandard } from "@/lib/data";

type SortKey =
  | "name"
  | "indoor"
  | "outdoor"
  | "collegiate"
  | "personal"
  | "rank_indoor"
  | "rank_outdoor";

const numConvert = (value: string | number | null) => {
  if (value === null || value === undefined || value === "-") return "-";
  const str = String(value);
  if (!str.includes(".")) return str;
  let seconds = Number(str);
  if (seconds > 60) {
    let minutes = 0;
    while (seconds > 60) {
      minutes++;
      seconds -= 60;
    }
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  }
  return seconds.toFixed(2);
};

const cellMark = (c: BestCell) => (c ? Number(c.mark) : null);
const cellRank = (c: BestCell) => (c ? c.ranking : null);

const EventsClient = ({
  events,
  standards,
}: {
  events: LeaderboardEvent[];
  standards: QualifyingStandard[];
}) => {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedSex, setSelectedSex] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "ascending" | "descending";
  } | null>(null);

  const standardsByEvent = useMemo(() => {
    const acc: { [eventId: number]: { [gender: string]: QualifyingStandard } } = {};
    for (const s of standards) {
      (acc[s.event_id] ??= {})[s.gender] = s;
    }
    return acc;
  }, [standards]);

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

  const visibleEvents = events.filter(
    (e) =>
      (selectedEvent === "" || e.event_name === selectedEvent) &&
      (selectedSex === "" || e.rows.some((r) => r.sex === selectedSex))
  );

  const markCell = (c: BestCell) => (
    <a href={c?.result_link ?? undefined} target="_blank" rel="noopener noreferrer">
      {numConvert(c ? c.mark : "-")}
    </a>
  );

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

      {visibleEvents.map((event) => {
        const showIndoor = event.event_season !== "Outdoor";
        const showOutdoor = event.event_season !== "Indoor";
        const rows = sortRows(
          event.rows.filter((r) => selectedSex === "" || r.sex === selectedSex)
        );
        return (
          <div key={event.event_id}>
            <h1>{event.event_name}</h1>
            <div>
              <div className="mac-standard">
                {standardsByEvent[event.event_id]?.m && (
                  <p>
                    Men&apos;s MAC Standard:{" "}
                    {numConvert(standardsByEvent[event.event_id].m.mac_qualifying_standard || "-")}
                  </p>
                )}
                {standardsByEvent[event.event_id]?.f && (
                  <p>
                    Women&apos;s MAC Standard:{" "}
                    {numConvert(standardsByEvent[event.event_id].f.mac_qualifying_standard || "-")}
                  </p>
                )}
              </div>
              <div className="aartfc-standard">
                {standardsByEvent[event.event_id]?.m && (
                  <p>
                    Men&apos;s AARTFC Standard:{" "}
                    {numConvert(standardsByEvent[event.event_id].m.aartfc_qualifying_standard || "-")}
                  </p>
                )}
                {standardsByEvent[event.event_id]?.f && (
                  <p>
                    Women&apos;s AARTFC Standard:{" "}
                    {numConvert(standardsByEvent[event.event_id].f.aartfc_qualifying_standard || "-")}
                  </p>
                )}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th onClick={() => requestSort("name")}>Athlete Name{sortIndicator("name")}</th>
                  {showIndoor && (
                    <th onClick={() => requestSort("indoor")}>Indoor Best{sortIndicator("indoor")}</th>
                  )}
                  {showOutdoor && (
                    <th onClick={() => requestSort("outdoor")}>Outdoor Best{sortIndicator("outdoor")}</th>
                  )}
                  <th onClick={() => requestSort("collegiate")}>
                    Collegiate Best{sortIndicator("collegiate")}
                  </th>
                  <th onClick={() => requestSort("personal")}>
                    Personal Best{sortIndicator("personal")}
                  </th>
                  {showIndoor && (
                    <th onClick={() => requestSort("rank_indoor")}>
                      Indoor Ranking{sortIndicator("rank_indoor")}
                    </th>
                  )}
                  {showOutdoor && (
                    <th onClick={() => requestSort("rank_outdoor")}>
                      Outdoor Ranking{sortIndicator("rank_outdoor")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.athlete_id}>
                    <td>
                      <b>
                        {row.nickname ? row.nickname : row.first_name} {row.last_name}
                      </b>
                    </td>
                    {showIndoor && <td>{markCell(row.indoor_best)}</td>}
                    {showOutdoor && <td>{markCell(row.outdoor_best)}</td>}
                    <td>{markCell(row.collegiate_best)}</td>
                    <td>{markCell(row.personal_best)}</td>
                    {showIndoor && <td>{row.indoor_best?.ranking ?? "-"}</td>}
                    {showOutdoor && <td>{row.outdoor_best?.ranking ?? "-"}</td>}
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
