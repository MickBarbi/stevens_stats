// Shared building blocks for the Satori-rendered share cards (app/**/opengraph-image.tsx,
// app/api/og/compare/route.tsx). Server-only — these hit Cloudinary and the data module,
// so nothing here may be imported by a client component.
import {
  alumniLabel,
  getAthlete,
  isFormerAthlete,
  progressionForAthlete,
  teamRank,
  type Athlete,
} from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import photoRev from "@/data/photo_rev.json";

const PHOTO_REV = (photoRev as { rev: number }).rev;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const YEAR_LABEL: Record<number, string> = {
  1: "First-Year",
  2: "Sophomore",
  3: "Junior",
  4: "Senior",
  5: "Grad Student",
  6: "Grad Student",
};

export const ogAthleteName = (a: Athlete): string =>
  `${a.nickname ?? a.first_name} ${a.last_name}`;

export const ogYearLabel = (a: Athlete): string =>
  isFormerAthlete(a) ? alumniLabel(a) : YEAR_LABEL[a.year] ?? `Year ${a.year}`;

export const ogInitials = (a: Athlete): string =>
  ((a.nickname?.[0] ?? a.first_name[0] ?? "") + (a.last_name[0] ?? "")).toUpperCase();

/** The event this athlete is best known for + their PB in it: the event they
 *  rank highest on the team list, breaking ties by how much they've competed it. */
export function ogHeadline(id: number, sex: string | null): string {
  const prog = progressionForAthlete(id);
  const pbs = prog.filter((p) => p.is_personal_best);
  if (pbs.length === 0) return "";

  const count = new Map<number, number>();
  for (const p of prog) count.set(p.event_id, (count.get(p.event_id) ?? 0) + 1);

  const best = pbs
    .map((p) => {
      const ranks = [
        teamRank(id, p.event_id, "indoor", sex),
        teamRank(id, p.event_id, "outdoor", sex),
      ].filter((r): r is number => r != null);
      return {
        p,
        rank: ranks.length ? Math.min(...ranks) : 99,
        n: count.get(p.event_id) ?? 0,
      };
    })
    .sort((a, b) => a.rank - b.rank || b.n - a.n)[0].p;

  return `${best.event_name} · PB ${formatMark(best.mark, markKind(best.event_id))}`;
}

/** Face-cropped Cloudinary photo, sized for a share card. Returns null (falls back
 *  to initials) if there's no photo or the fetch fails/times out. */
export async function ogPhotoUrl(
  a: Pick<Athlete, "image_path" | "athlete_id">,
  w: number,
  h: number
): Promise<string | null> {
  if (!CLOUD) return null;
  const publicId = a.image_path ?? String(a.athlete_id);
  const url = `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,g_face,w_${w},h_${h},f_jpg/${publicId}?v=${PHOTO_REV}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { signal: ctrl.signal, cache: "force-cache" });
    clearTimeout(t);
    return r.ok ? url : null;
  } catch {
    return null;
  }
}

export { getAthlete };
