import { notFound } from "next/navigation";
import {
  athletes,
  getAthlete,
  progressionForAthlete,
  athletePickerList,
  adjacentActiveAthletes,
} from "@/lib/data";
import AthleteProfile from "./AthleteProfile";

export function generateStaticParams() {
  return athletes.map((a) => ({ athleteId: String(a.athlete_id) }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const a = getAthlete(Number((await params).athleteId));
  if (!a) return {};
  const name = `${a.nickname ?? a.first_name} ${a.last_name}`;
  return {
    title: `${name} — Stevens Stats`,
    description: a.bio ?? `Track & field results and progression for ${name}.`,
  };
}

export default async function AthletePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const id = Number(athleteId);
  const athlete = getAthlete(id);
  if (!athlete) notFound();

  const { prev, next } = adjacentActiveAthletes(id);

  return (
    <AthleteProfile
      athlete={athlete}
      progression={progressionForAthlete(id)}
      others={athletePickerList()}
      prev={prev}
      next={next}
    />
  );
}
