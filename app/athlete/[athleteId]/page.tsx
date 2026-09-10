import { notFound } from "next/navigation";
import {
  athletes,
  getAthlete,
  progressionForAthlete,
  athletePickerList,
  adjacentActiveAthletes,
  teamRank,
} from "@/lib/data";
import type { EventRankMap } from "@/lib/athlete";
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
  const title = `${name} — Stevens Stats`;
  const description =
    a.bio ?? `Track & field results and progression for ${name}.`;
  // og:image / twitter:image come from opengraph-image.tsx in this folder.
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
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
  const progression = progressionForAthlete(id);

  // Precompute team-list ranks here (server) so AthleteProfile never has to
  // import lib/data — that import pulls the whole dataset into the client bundle.
  const ranks: EventRankMap = {};
  for (const p of progression) {
    if (p.event_id in ranks) continue;
    ranks[p.event_id] = {
      indoor: teamRank(id, p.event_id, "indoor", athlete.sex),
      outdoor: teamRank(id, p.event_id, "outdoor", athlete.sex),
    };
  }

  return (
    <AthleteProfile
      athlete={athlete}
      progression={progression}
      ranks={ranks}
      others={athletePickerList()}
      prev={prev}
      next={next}
    />
  );
}
