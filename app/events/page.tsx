import { currentSeason, eventLeaderboard, qualifyingStandards } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import EventsClient from "./EventsClient";

export const metadata = pageMetadata({
  title: "Event Leaderboards",
  ogTitle: "Stevens Track & Field — Event Leaderboards",
  path: "/events",
  description:
    "Stevens track & field event leaderboards — season and all-time bests for every " +
    "event, indoor and outdoor, with MAC and AARTFC conference qualifying standards " +
    "marked on each list.",
});

export default function EventsPage() {
  return (
    <EventsClient
      events={eventLeaderboard()}
      standards={qualifyingStandards}
      defaultSeason={currentSeason()}
    />
  );
}
