// Canonical origin for absolute URLs (metadata, OG, sitemap, robots, JSON-LD).
//
// On Vercel production, VERCEL_PROJECT_PRODUCTION_URL is set automatically
// (e.g. "stevens-stats.vercel.app"). If you point a custom domain at the site
// you MUST set NEXT_PUBLIC_SITE_URL to it in the Vercel project env — otherwise
// every canonical / og:url / sitemap entry keeps pointing at the vercel.app
// host, which splits your ranking signal.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Stevens Stats";

export const SITE_TITLE =
  "Stevens Stats — Stevens Track & Field Results, Rosters & Records";

export const SITE_DESCRIPTION =
  "Meet results, rosters, all-time top-10 lists and season-by-season progression " +
  "for the Stevens Institute of Technology track & field team. Built for fans " +
  "following how their people are doing.";

export const TEAM_NAME = "Stevens Institute of Technology Track & Field";
