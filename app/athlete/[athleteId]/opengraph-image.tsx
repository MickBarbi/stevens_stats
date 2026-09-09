import { ImageResponse } from "next/og";
import {
  alumniLabel,
  athletes,
  getAthlete,
  isFormerAthlete,
  progressionForAthlete,
  teamRank,
} from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Stevens Stats — athlete card";
export const dynamicParams = false;

export function generateStaticParams() {
  return athletes.map((a) => ({ athleteId: String(a.athlete_id) }));
}

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const YEAR_LABEL: Record<number, string> = {
  1: "First-Year",
  2: "Sophomore",
  3: "Junior",
  4: "Senior",
  5: "Grad Student",
  6: "Grad Student",
};

// The event this athlete is best known for + their PB in it: the event they
// rank highest on the team list, breaking ties by how much they've competed it.
function headlineFor(id: number, sex: string | null): string {
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

async function photoUrl(imagePath: string | null, athleteId: number): Promise<string | null> {
  if (!CLOUD) return null;
  const publicId = imagePath ?? String(athleteId);
  const url = `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,g_face,w_480,h_630,f_jpg/${publicId}`;
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

export default async function Image({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const id = Number((await params).athleteId);
  const a = getAthlete(id);

  const name = a ? `${a.nickname ?? a.first_name} ${a.last_name}` : "Athlete";
  const year = !a
    ? ""
    : isFormerAthlete(a)
      ? alumniLabel(a)
      : YEAR_LABEL[a.year] ?? `Year ${a.year}`;
  const headline = a ? headlineFor(id, a.sex) : "";
  const photo = a ? await photoUrl(a.image_path, a.athlete_id) : null;
  const initials = a
    ? ((a.nickname?.[0] ?? a.first_name[0] ?? "") + (a.last_name[0] ?? "")).toUpperCase()
    : "SS";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 480,
            height: "100%",
            background: "#992211",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} width={480} height={630} style={{ objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ fontSize: 190, fontWeight: 800, color: "#ffffff" }}>{initials}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "0 64px",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#992211",
            }}
          >
            STEVENS TRACK &amp; FIELD
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              color: "#18181b",
              marginTop: 18,
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          {year ? (
            <div style={{ fontSize: 30, color: "#52525b", marginTop: 16 }}>{year}</div>
          ) : null}
          {headline ? (
            <div
              style={{
                fontSize: 33,
                fontWeight: 600,
                color: "#992211",
                marginTop: 30,
              }}
            >
              {headline}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size }
  );
}
