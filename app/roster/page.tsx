import { activeAthletes } from "@/lib/data";
import RosterClient from "./RosterClient";

export default function RosterPage() {
  return <RosterClient athletes={activeAthletes()} />;
}
