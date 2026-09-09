import { rosterEntries, events } from "@/lib/data";
import RosterClient from "./RosterClient";

export default function RosterPage() {
  return (
    <RosterClient
      entries={rosterEntries()}
      events={events.map((e) => ({
        event_id: e.event_id,
        event_name: e.event_name,
        higher_is_better: e.higher_is_better,
      }))}
    />
  );
}
