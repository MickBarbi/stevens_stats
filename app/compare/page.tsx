import { Suspense } from "react";
import type { Metadata } from "next";
import { athletePickerList, events, getAthlete } from "@/lib/data";
import { SITE_NAME, pageMetadata } from "@/lib/site";
import CompareClient from "./CompareClient";

const eventMeta: Record<number, { name: string; hib: boolean }> =
  Object.fromEntries(
    events.map((e) => [e.event_id, { name: e.event_name, hib: e.higher_is_better }])
  );

const DESCRIPTION =
  "Put two Stevens track & field athletes side by side — career bests, " +
  "all-time team ranks and progression curves, event by event.";

const FALLBACK = pageMetadata({
  title: "Compare Athletes",
  ogTitle: "Compare Stevens Track & Field Athletes",
  path: "/compare",
  description: DESCRIPTION,
});

const idParam = (v: string | undefined): number | null => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : null;
};

const nameOf = (id: number | null): string | null => {
  if (id == null) return null;
  const a = getAthlete(id);
  return a ? `${a.nickname ?? a.first_name} ${a.last_name}` : null;
};

// A share of a specific comparison (?a=<id>&b=<id>) gets its own title and a
// card built for that matchup — reading query params opts this route out of
// static rendering, which is the cost of the OG image actually matching what
// was shared. The bare /compare (no query) stays on the generic fallback.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const aId = idParam(sp.a);
  const bId = idParam(sp.b);
  const aName = nameOf(aId);
  const bName = nameOf(bId);
  if (!aName || !bName) return FALLBACK;

  const title = `${aName} vs ${bName}`;
  const social = `${title} — Stevens Track & Field`;
  const description =
    `${aName} vs ${bName}: career bests, all-time team ranks and ` +
    `progression, event by event, for Stevens track & field.`;
  const path = `/compare?a=${aId}&b=${bId}`;
  const image = {
    url: `/api/og/compare?a=${aId}&b=${bId}`,
    width: 1200,
    height: 630,
    alt: `${title} — head-to-head comparison card`,
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: social,
      description,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [image],
    },
  };
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareClient athletes={athletePickerList()} eventMeta={eventMeta} />
    </Suspense>
  );
}
