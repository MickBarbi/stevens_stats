import { Suspense } from "react";
import { events } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import ProgressionClient from "./ProgressionClient";

export const metadata = pageMetadata({
  title: "Team Progression",
  ogTitle: "Stevens Track & Field — Team Best by Year",
  path: "/events/progression",
  description:
    "How the Stevens track & field team's best mark in each event has moved " +
    "year over year, indoor and outdoor, men and women — the program's " +
    "trajectory in one chart.",
});

export default function ProgressionPage() {
  return (
    <Suspense fallback={null}>
      <ProgressionClient events={events} />
    </Suspense>
  );
}
