// Canonical origin for every absolute URL the site emits — metadata, og:url,
// canonical tags, sitemap, robots, JSON-LD. Hard-coded to the production domain
// so it's right no matter where the build runs (Vercel, CI, local). Override
// with NEXT_PUBLIC_SITE_URL only if the domain ever changes.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://stevens-stats.com"
).replace(/\/$/, "");

export const SITE_NAME = "Stevens Stats";

export const SITE_TITLE =
  "Stevens Stats — Stevens Track & Field Results, Rosters & Records";

export const SITE_DESCRIPTION =
  "Meet results, rosters, all-time top-10 lists and season-by-season progression " +
  "for the Stevens Institute of Technology track & field team. Built for fans " +
  "following how their people are doing.";

export const TEAM_NAME = "Stevens Institute of Technology Track & Field";

// The site-wide social card lives at app/opengraph-image.tsx. Next only attaches
// a file-convention image to its own segment, and a page that sets `openGraph`
// shallow-overrides the layout's — so every page has to name the image itself.
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Stevens Stats — Stevens track & field results, rosters and records",
};

type PageMetaInput = {
  title?: string; // omit to use the site default title
  description: string;
  path: string; // for canonical + og:url, e.g. "/roster"
  ogTitle?: string; // social card title (defaults to `title`, then site title)
};

/** Consistent per-page metadata: title, description, canonical, OG + Twitter. */
export function pageMetadata({ title, description, path, ogTitle }: PageMetaInput) {
  const social = ogTitle ?? title ?? SITE_TITLE;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website" as const,
      siteName: SITE_NAME,
      title: social,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: social,
      description,
      images: [OG_IMAGE],
    },
  };
}
