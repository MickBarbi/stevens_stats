// Pure athlete helpers — no data imports, so client components can use these
// without pulling athletes/performances/top10 JSON into their bundle. Keep this
// module dependency-free. lib/data.ts re-exports both for server callers.

export const isFormerAthlete = (a: {
  active: boolean;
  status: string | null;
}): boolean => !a.active || a.status != null;

export const alumniLabel = (a: {
  graduation_year: number | null;
  status: string | null;
}): string => {
  if (a.status === "transferred") return "Transferred";
  if (a.graduation_year) return `Class of '${String(a.graduation_year).slice(-2)}`;
  return "Alum";
};

/** Per-event team-list ranks for one athlete, keyed by event_id. Built on the
 *  server (page.tsx) and handed to the client profile so it never imports the
 *  data module. */
export type EventRankMap = Record<
  number,
  { indoor: number | null; outdoor: number | null }
>;
