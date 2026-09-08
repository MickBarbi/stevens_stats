import { athletePickerList } from "@/lib/data";
import AthletePicker from "./AthletePicker";

export default function AthleteIndexPage() {
  return (
    <div className="p-6 mt-28">
      <AthletePicker athletes={athletePickerList()} />
      <p className="mt-6 text-gray-600">Pick an athlete to see their bests and progression.</p>
    </div>
  );
}
