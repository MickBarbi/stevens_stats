// Pure date helper — no data imports, so client components can use this
// without pulling athletes/performances/top10 JSON into their bundle. Keep
// this module dependency-free (mirrors lib/athlete.ts). lib/data.ts
// re-exports it for server callers.

// The competitive year a mark counts for: indoor marks from December roll into
// the next calendar year (matches scraper/load.py's Dec-1 cutoff). Used for the
// Top 10 page's this-season / last-season highlighting and the Home strip.
export const seasonYearOf = (d: Date): number =>
  d.getFullYear() + (d.getMonth() >= 11 ? 1 : 0);

/** The season treated as "this season" — the most recent one to have begun.
 *  Rolls to the next year in December, so a fall visit still points at the
 *  spring season that just finished. */
export const currentSeasonYear = (now: Date = new Date()): number =>
  seasonYearOf(now);
