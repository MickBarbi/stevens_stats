import type { Metadata } from "next";
import { currentSeason, eventLeaderboard, qualifyingStandards } from "@/lib/data";
import EventsClient from "./EventsClient";

const description =
  "Stevens track & field event leaderboards — season and all-time bests for every " +
  "event, indoor and outdoor, with MAC and AARTFC conference qualifying standards " +
  "marked on each list.";

export const metadata: Metadata = {
  title: "Event Leaderboards",
  description,
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Stevens Track & Field — Event Leaderboards",
    description,
    url: "/events",
  },
};

export default function EventsPage() {
  return (
    <EventsClient
      events={eventLeaderboard()}
      standards={qualifyingStandards}
      defaultSeason={currentSeason()}
    />
  );
}
