"use client";

import React, { useEffect, useState } from "react";
import "./styles.css";

interface Athlete {
  athlete_id: number;
  collegiate_best: number | null;
  event_id: number;
  overall_best_indoor: number | null;
  overall_best_outdoor: number | null;
  personal_best: number;
  rank_position_indoor: number | null;
  rank_position_outdoor: number | null;
  result_id: number;
  season_best_indoor: number | null;
  season_best_outdoor: number | null;
  Athletes: {
    athlete_id: number;
    bio: string | null;
    first_name: string;
    graduation_year: null;
    image_path: string | null;
    last_name: string;
    nickname: string | null;
    sex: string;
    year: number;
  };
  Events: {
    event_id: number;
    event_name: string;
    event_season: string;
  };
  Performances_Bests_collegiate_bestToPerformances: {
    athlete_id: number;
    date: Date;
    event_id: number;
    mark: number;
    performance_id: number;
    ranking: number | null;
    result_link: string | null;
    season: string;
  };
  Performances_Bests_overall_best_indoorToPerformances: {
    athlete_id: number;
    date: Date;
    event_id: number;
    mark: number;
    performance_id: number;
    ranking: number | null;
    result_link: string | null;
    season: string;
  };
  Performances_Bests_overall_best_outdoorToPerformances: {
    athlete_id: number;
    date: Date;
    event_id: number;
    mark: number;
    performance_id: number;
    ranking: number | null;
    result_link: string | null;
    season: string;
  };
  Performances_Bests_personal_bestToPerformances: {
    athlete_id: number;
    date: Date;
    event_id: number;
    mark: number;
    performance_id: number;
    ranking: number | null;
    result_link: string | null;
    season: string;
  };
  Performances_Bests_season_best_indoorToPerformances: {
    athlete_id: number;
    date: Date;
    event_id: number;
    mark: number;
    performance_id: number;
    ranking: number | null;
    result_link: string | null;
    season: string;
  };
  Performances_Bests_season_best_outdoorToPerformances: {
    athlete_id: number;
    date: Date;
    event_id: number;
    mark: number;
    performance_id: number;
    ranking: number | null;
    result_link: string | null;
    season: string;
  };
}

interface Event {
  event_id: number;
  event_name: string;
  event_season: string;
}

interface GroupedDataItem {
  event: Event;
  athletes: Athlete[];
}

interface QualifyingStandard {
  aartfc_qualifying_standard: number | null;
  event_id: number;
  gender: string;
  mac_qualifying_standard: number | null;
  season: string;
}

const numConvert = (seconds: number | string | null) => {
  if (seconds === "-" || seconds === null) {
    return seconds;
  }
  seconds = String(seconds);
  if (!seconds.includes(".")) {
    return seconds;
  }
  seconds = Number(seconds);
  if (seconds > 60) {
    let minutes = 0;
    while (seconds > 60) {
      minutes++;
      seconds -= 60;
    }
    return `${minutes}:${seconds.toFixed(2).toString().padStart(5, "0")}`;
  }
  return seconds;
};

const EventPage = () => {
  const [data, setData] = useState<{
    bests: Athlete[];
    qualifyingStandards: QualifyingStandard[];
  }>({ bests: [], qualifyingStandards: [] });
  const [selectedEvent, setSelectedEvent] = useState(""); // Event filter
  const [selectedSex, setSelectedSex] = useState(""); // Sex filter
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Athlete | null;
    direction: "ascending" | "descending";
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/api/events");
      const result = await response.json();

      console.log(result);

      const bests = result.slice(0, -30);
      const qualifyingStandards = result.slice(-30);

      setData({ bests, qualifyingStandards });
    };
    fetchData();
  }, []);

  // Function to get the mark based on the key in sortConfig
  const getMarkValue = (athlete: Athlete, key: string | null) => {
    switch (key) {
      case "Athletes":
        return athlete.Athletes.last_name.toLowerCase(); // Ensure case-insensitive comparison
      case "overall_best_indoor":
        return (
          athlete.Performances_Bests_overall_best_indoorToPerformances?.mark?.toString() ||
          ""
        );
      case "overall_best_outdoor":
        return (
          athlete.Performances_Bests_overall_best_outdoorToPerformances?.mark?.toString() ||
          ""
        );
      case "collegiate_best":
        return (
          athlete.Performances_Bests_collegiate_bestToPerformances?.mark?.toString() ||
          ""
        );
      case "personal_best":
        return (
          athlete.Performances_Bests_personal_bestToPerformances?.mark?.toString() ||
          ""
        );
      case "rank_position_indoor":
        return (
          athlete.Performances_Bests_overall_best_indoorToPerformances?.ranking?.toString() ||
          ""
        );
      case "rank_position_outdoor":
        return (
          athlete.Performances_Bests_overall_best_outdoorToPerformances?.ranking?.toString() ||
          ""
        );
      default:
        return "";
    }
  };

  const getEventName = (key: string) => {
    switch (key) {
      case "10000m":
        return "10,000m";
      case "60mH":
        return "60m Hurdles";
      case "100mH":
        return "100m Hurdles";
      case "110mH":
        return "110m Hurdles";
      case "400mH":
        return "400m Hurdles";
      case "3000mSC":
        return "3000m Steeplechase";
      case "High_Jump":
        return "High Jump";
      case "Long_Jump":
        return "Long Jump";
      case "Pole_Vault":
        return "Pole Vault";
      case "Triple_Jump":
        return "Triple Jump";
      case "Shot_Put":
        return "Shot Put";
      case "Hammer_Throw":
        return "Hammer Throw";
      case "Weight_Throw":
        return "Weight Throw";
      default:
        return key;
    }
  };

  const sortedAthletes = (athletes: Athlete[]) => {
    if (!sortConfig || !sortConfig.key) return athletes;

    const sortedArray = [...athletes].sort((a, b) => {
      const aMark = getMarkValue(a, sortConfig.key);
      const bMark = getMarkValue(b, sortConfig.key);

      // If both are equal, return 0
      if (aMark === bMark) return 0;

      // If either is an empty string (which represents null), put that value at the end
      if (aMark === "") return 1;
      if (bMark === "") return -1;

      // For alphabetical sorting by last name, use localeCompare
      if (sortConfig.key === "Athletes") {
        return sortConfig.direction === "ascending"
          ? aMark.localeCompare(bMark)
          : bMark.localeCompare(aMark);
      }

      // For numerical sorting, treat values as numbers
      return sortConfig.direction === "ascending"
        ? Number(aMark) - Number(bMark)
        : Number(bMark) - Number(aMark);
    });

    return sortedArray;
  };

  const requestSort = (key: keyof Athlete) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return {
          key,
          direction:
            prev.direction === "ascending" ? "descending" : "ascending",
        };
      }
      return { key, direction: "ascending" };
    });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === "ascending" ? " ▲" : " ▼";
    }
    return "";
  };

  // Define the structure of qualifying standards per event and sex
  const standardsByEvent: {
    [eventId: number]: {
      [gender: string]: QualifyingStandard;
    };
  } = data.qualifyingStandards.reduce(
    (acc, standard) => {
      const { event_id, gender } = standard;

      if (!acc[event_id]) {
        acc[event_id] = {};
      }

      acc[event_id][gender] = standard;

      return acc;
    },
    {} as {
      [eventId: number]: {
        [gender: string]: QualifyingStandard;
      };
    }
  );

  // Group performances by event in the bests data
  const groupedData: { [eventId: number]: GroupedDataItem } = data.bests.reduce(
    (acc, curr) => {
      const eventId = curr.Events.event_id;

      if (!acc[eventId]) {
        acc[eventId] = {
          event: curr.Events,
          athletes: [],
        };
      }

      acc[eventId].athletes.push(curr);
      return acc;
    },
    {} as { [eventId: number]: GroupedDataItem }
  );

  const filteredData = Object.values(groupedData).filter(
    (groupedItem): groupedItem is GroupedDataItem => {
      const { event, athletes } = groupedItem;
      return (
        (selectedEvent === "" || event.event_name === selectedEvent) &&
        (selectedSex === "" || athletes.some((athlete) => athlete.Athletes.sex === selectedSex))
      );
    }
  );

  return (
    <div className="px-6">
      <h1 className="beginning">Events Page</h1>
      {/* Event Dropdown */}
      <select
        onChange={(e) => setSelectedEvent(e.target.value)}
        value={selectedEvent}
      >
        <option value="">All Events</option>
        {Object.values(groupedData).map(({ event }) => (
          <option key={event.event_id} value={event.event_name}>
            {getEventName(event.event_name)}
          </option>
        ))}
      </select>

      {/* Sex Dropdown */}
      <select
        onChange={(e) => setSelectedSex(e.target.value)}
        value={selectedSex}
      >
        <option value="">All Genders</option>
        <option value="m">Men</option>
        <option value="f">Women</option>
      </select>

      {filteredData.map(({ event, athletes }) => (
        <div key={event.event_id}>
          <h1>{getEventName(event.event_name)}</h1>
          {/* Display Qualifying Standards Above Each Event Table */}
          <div>
            <div className="mac-standard">
              {standardsByEvent[event.event_id]?.m && (
                <p>
                  Men&apos;s Indoor MAC Standard:{" "}
                  {numConvert(
                    standardsByEvent[event.event_id].m
                      .mac_qualifying_standard || "-"
                  )}
                </p>
              )}
              {standardsByEvent[event.event_id]?.f && (
                <p>
                  Women&apos;s Indoor MAC Standard:{" "}
                  {numConvert(
                    standardsByEvent[event.event_id].f
                      .mac_qualifying_standard || "-"
                  )}
                </p>
              )}
            </div>
            <div className="aartfc-standard">
              {standardsByEvent[event.event_id]?.m && (
                <p>
                  Men&apos;s Indoor AARTFC Standard:{" "}
                  {numConvert(
                    standardsByEvent[event.event_id].m
                      .aartfc_qualifying_standard || "-"
                  )}
                </p>
              )}
              {standardsByEvent[event.event_id]?.f && (
                <p>
                  Women&apos;s Indoor AARTFC Standard:{" "}
                  {numConvert(
                    standardsByEvent[event.event_id].f
                      .aartfc_qualifying_standard || "-"
                  )}
                </p>
              )}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th onClick={() => requestSort("Athletes")}>
                  Athlete Name{getSortIndicator("Athletes")}
                </th>
                {event.event_season !== "Outdoor" && (
                  <th onClick={() => requestSort("overall_best_indoor")}>
                    Indoor Best{getSortIndicator("overall_best_indoor")}
                  </th>
                )}
                {event.event_season !== "Indoor" && (
                  <th onClick={() => requestSort("overall_best_outdoor")}>
                    Outdoor Best{getSortIndicator("overall_best_outdoor")}
                  </th>
                )}
                <th onClick={() => requestSort("collegiate_best")}>
                  Collegiate Best{getSortIndicator("collegiate_best")}
                </th>
                <th onClick={() => requestSort("personal_best")}>
                  Personal Best{getSortIndicator("personal_best")}
                </th>
                {event.event_season !== "Outdoor" && (
                  <th onClick={() => requestSort("rank_position_indoor")}>
                    Indoor Ranking{getSortIndicator("rank_position_indoor")}
                  </th>
                )}
                {event.event_season !== "Indoor" && (
                  <th onClick={() => requestSort("rank_position_outdoor")}>
                    Outdoor Ranking{getSortIndicator("rank_position_outdoor")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedAthletes(athletes)
                .filter(
                  (athlete) =>
                    selectedSex === "" || athlete.Athletes.sex === selectedSex
                )
                .map((athlete) => (
                  <tr key={athlete.result_id}>
                    <td>
                      <b>
                        {athlete.Athletes.nickname ? athlete.Athletes.nickname : athlete.Athletes.first_name}{" "}
                        {athlete.Athletes.last_name}
                      </b>
                    </td>
                    {event.event_season !== "Outdoor" && (
                      <td>
                        <a
                          href={`${athlete.Performances_Bests_overall_best_indoorToPerformances?.result_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {numConvert(
                            athlete
                              .Performances_Bests_overall_best_indoorToPerformances
                              ?.mark || "-"
                          )}
                        </a>
                      </td>
                    )}
                    {event.event_season !== "Indoor" && (
                      <td>
                        <a
                          href={`${athlete.Performances_Bests_overall_best_outdoorToPerformances?.result_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {numConvert(
                            athlete
                              .Performances_Bests_overall_best_outdoorToPerformances
                              ?.mark || "-"
                          )}
                        </a>
                      </td>
                    )}
                    <td>
                      <a
                        href={`${athlete.Performances_Bests_collegiate_bestToPerformances?.result_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {numConvert(
                          athlete
                            .Performances_Bests_collegiate_bestToPerformances
                            ?.mark || "-"
                        )}
                      </a>
                    </td>
                    <td>
                      <a
                        href={`${athlete.Performances_Bests_personal_bestToPerformances?.result_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {numConvert(
                          athlete.Performances_Bests_personal_bestToPerformances
                            ?.mark || "-"
                        )}
                      </a>
                    </td>
                    {event.event_season !== "Outdoor" && (
                      <td>
                        {athlete
                          .Performances_Bests_overall_best_indoorToPerformances
                          ?.ranking ?? "-"}
                      </td>
                    )}
                    {event.event_season !== "Indoor" && (
                      <td>
                        {athlete
                          .Performances_Bests_overall_best_outdoorToPerformances
                          ?.ranking ?? "-"}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default EventPage;
