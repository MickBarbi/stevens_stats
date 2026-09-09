import { athletePickerList } from "@/lib/data";
import AthletePicker from "./AthletePicker";

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
