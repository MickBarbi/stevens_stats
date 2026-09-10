import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  athletes,
  getAthlete,
  progressionForAthlete,
  athletePickerList,
  adjacentActiveAthletes,
  teamRank,
} from "@/lib/data";
import { alumniLabel, isFormerAthlete, type EventRankMap } from "@/lib/athlete";
import { SITE_URL, TEAM_NAME } from "@/lib/site";
import JsonLd from "@/components/JsonLd";
import AthleteProfile from "./AthleteProfile";

export function generateStaticParams() {
  return athletes.map((a) => ({ athleteId: String(a.athlete_id) }));
}

export const dynamicParams = false;

const YEAR_WORD: Record<number, string> = {
  1: "first-year",
  2: "sophomore",
  3: "junior",
  4: "senior",
  5: "graduate",
  6: "graduate",
};

const standing = (a: NonNullable<ReturnType<typeof getAthlete>>) =>
  isFormerAthlete(a)
    ? alumniLabel(a).toLowerCase()
    : YEAR_WORD[a.year]
      ? `${YEAR_WORD[a.year]}`
      : "";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}): Promise<Metadata> {
  const a = getAthlete(Number((await params).athleteId));
  if (!a) return {};
  const name = `${a.nickname ?? a.first_name} ${a.last_name}`;
  const team =
    a.sex === "f" ? "women's" : a.sex === "m" ? "men's" : "";
  const who = [standing(a), team, "track & field at Stevens"]
    .filter(Boolean)
    .join(" ");
  const description = a.bio
    ? a.bio.length > 200
      ? `${a.bio.slice(0, 197)}…`
      : a.bio
    : `${name} — ${who}. Career bests, all-time team ranks, conference-standard ` +
      `context and season-by-season progression charts.`;

  return {
    title: name,
    description,
    keywords: [name, `${name} Stevens`, `${name} track and field`, `${name} TFRRS`],
    alternates: { canonical: `/athlete/${a.athlete_id}` },
    openGraph: {
      type: "profile",
      title: `${name} — Stevens Track & Field`,
      description,
      url: `/athlete/${a.athlete_id}`,
      firstName: a.first_name,
      lastName: a.last_name,
    },
    twitter: { card: "summary_large_image", title: `${name} — Stevens Track & Field` },
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

  const name = `${athlete.nickname ?? athlete.first_name} ${athlete.last_name}`;
  const lastDate = progression.at(-1)?.date; // progression is sorted ascending
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateModified: lastDate
      ? new Date(`${lastDate}T00:00:00Z`).toISOString()
      : undefined,
    mainEntity: {
      "@type": "Person",
      "@id": `${SITE_URL}/athlete/${id}#person`,
      name,
      givenName: athlete.first_name,
      familyName: athlete.last_name,
      url: `${SITE_URL}/athlete/${id}`,
      image: `${SITE_URL}/athlete/${id}/opengraph-image`,
      // links this profile to the athlete's TFRRS page — a strong entity signal
      sameAs: [`https://www.tfrrs.org/athletes/${id}`],
      jobTitle: "Track & field athlete",
      ...(athlete.bio ? { description: athlete.bio } : {}),
      ...(athlete.awards.length ? { award: athlete.awards } : {}),
      memberOf: {
        "@type": "SportsTeam",
        name: TEAM_NAME,
        sport: "Track and field",
      },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <AthleteProfile
        athlete={athlete}
        progression={progression}
        ranks={ranks}
        others={athletePickerList()}
        prev={prev}
        next={next}
      />
    </>
  );
}
