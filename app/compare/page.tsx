import { Suspense } from "react";
import { athletePickerList, events } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import CompareClient from "./CompareClient";

export const metadata = pageMetadata({
  title: "Compare Athletes",
  ogTitle: "Compare Stevens Track & Field Athletes",
  path: "/compare",
  description:
    "Put two Stevens track & field athletes side by side — career bests, " +
    "all-time team ranks and progression curves, event by event.",
});

const eventMeta: Record<number, { name: string; hib: boolean }> =
  Object.fromEntries(
    events.map((e) => [e.event_id, { name: e.event_name, hib: e.higher_is_better }])
  );

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareClient athletes={athletePickerList()} eventMeta={eventMeta} />
    </Suspense>
  );
}
