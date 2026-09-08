import { notFound } from "next/navigation";
import {
  athletes,
  getAthlete,
  progressionForAthlete,
  athletePickerList,
} from "@/lib/data";
import AthleteProfile from "./AthleteProfile";

export function generateStaticParams() {
  return athletes.map((a) => ({ athleteId: String(a.athlete_id) }));
}

export const dynamicParams = false;

export default async function AthletePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const id = Number(athleteId);
  const athlete = getAthlete(id);
  if (!athlete) notFound();

  return (
    <AthleteProfile
      athlete={athlete}
      progression={progressionForAthlete(id)}
      others={athletePickerList()}
    />
  );
}
