import { currentSeason, eventLeaderboard, qualifyingStandards } from "@/lib/data";
import EventsClient from "./EventsClient";

export default function EventsPage() {
  return (
    <EventsClient
      events={eventLeaderboard()}
      standards={qualifyingStandards}
      defaultSeason={currentSeason()}
    />
  );
}
