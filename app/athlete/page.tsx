import type { Metadata } from "next";
import { athletePickerList } from "@/lib/data";
import AthletePicker from "./AthletePicker";

const description =
  "Find any Stevens track & field athlete — career bests, season-by-season " +
  "progression charts, conference-standard context and where they rank all-time.";

export const metadata: Metadata = {
  title: "Athletes",
  description,
  alternates: { canonical: "/athlete" },
  openGraph: {
    title: "Stevens Track & Field Athletes",
    description,
    url: "/athlete",
  },
};

export default function AthleteIndexPage() {
  return (
    <div>
      <AthletePicker athletes={athletePickerList()} />
      <p className="mt-6 text-fg-muted">
        Pick an athlete to see their bests and progression.
      </p>
    </div>
  );
}
