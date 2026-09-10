import { topTen } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import RecordsClient from "./RecordsClient";

export const metadata = pageMetadata({
  title: "All-Time Top 10",
  ogTitle: "Stevens Track & Field — All-Time Top 10",
  path: "/records",
  description:
    "Stevens track & field all-time top-10 lists — the fastest, longest and highest " +
    "marks in program history, indoor and outdoor, for every event and both teams.",
});

export default function RecordsPage() {
  return <RecordsClient lists={topTen} />;
}
