import { athletePickerList } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import AthletePicker from "./AthletePicker";

export const metadata = pageMetadata({
  title: "Athletes",
  ogTitle: "Stevens Track & Field Athletes",
  path: "/athlete",
  description:
    "Find any Stevens track & field athlete — career bests, season-by-season " +
    "progression charts, conference-standard context and where they rank all-time.",
});

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
