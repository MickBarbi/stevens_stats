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
