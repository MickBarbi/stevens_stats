import { currentSeason, eventLeaderboard, qualifyingStandards } from "@/lib/data";
import EventsClient from "./EventsClient";
import "./styles.css";

export default function EventsPage() {
  return (
    <EventsClient
      events={eventLeaderboard()}
      standards={qualifyingStandards}
      defaultSeason={currentSeason()}
    />
  );
}
