import { rosterEntries, events } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import RosterClient from "./RosterClient";

export const metadata = pageMetadata({
  title: "Roster",
  ogTitle: "Stevens Track & Field Roster",
  path: "/roster",
  description:
    "The full Stevens Institute of Technology track & field roster — every athlete " +
    "with their event specialties, class year and personal bests. Filter by event, " +
    "class year or gender, and browse alumni back to 2010.",
});

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
