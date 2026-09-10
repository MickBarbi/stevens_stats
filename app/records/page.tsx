import type { Metadata } from "next";
import { topTen } from "@/lib/data";
import RecordsClient from "./RecordsClient";

const description =
  "Stevens track & field all-time top-10 lists — the fastest, longest and highest " +
  "marks in program history, indoor and outdoor, for every event and both teams.";

export const metadata: Metadata = {
  title: "All-Time Top 10",
  description,
  alternates: { canonical: "/records" },
  openGraph: {
    title: "Stevens Track & Field — All-Time Top 10",
    description,
    url: "/records",
  },
};

export default function RecordsPage() {
  return <RecordsClient lists={topTen} />;
}
