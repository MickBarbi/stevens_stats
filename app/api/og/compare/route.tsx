import { ImageResponse } from "next/og";
import { getAthlete, ogHeadline, ogInitials, ogPhotoUrl, ogYearLabel } from "@/lib/ogCard";

// Dynamic share card for a specific comparison: /api/og/compare?a=<id>&b=<id>.
// Unlike the athlete card, this can't be a file-convention opengraph-image.tsx —
// those only receive route `params`, never the query string a comparison lives in
// — so it's a plain Route Handler that reads searchParams itself and returns the
// image directly. See generateMetadata in app/compare/page.tsx for the caller.

const PANEL_W = 460;
const PHOTO = 220;

type Side = {
  name: string;
  year: string;
  headline: string;
  initials: string;
  photo: string | null;
} | null;

async function loadSide(id: number | null): Promise<Side> {
  if (id == null) return null;
  const a = getAthlete(id);
  if (!a) return null;
  return {
    name: `${a.nickname ?? a.first_name} ${a.last_name}`,
    year: ogYearLabel(a),
    headline: ogHeadline(id, a.sex),
    initials: ogInitials(a),
    photo: await ogPhotoUrl(a, PHOTO, PHOTO),
  };
}

function Panel({ data }: { data: Side }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: PANEL_W,
      }}
    >
      <div
        style={{
          display: "flex",
          width: PHOTO,
          height: PHOTO,
          borderRadius: PHOTO / 2,
          overflow: "hidden",
          background: "#992211",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data?.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.photo} width={PHOTO} height={PHOTO} style={{ objectFit: "cover" }} alt="" />
        ) : (
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#ffffff" }}>
            {data?.initials ?? "SS"}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 42,
          fontWeight: 800,
          color: "#18181b",
          marginTop: 26,
          textAlign: "center",
        }}
      >
        {data?.name ?? "TBD"}
      </div>
      {data?.year && (
        <div style={{ display: "flex", fontSize: 24, color: "#52525b", marginTop: 8 }}>
          {data.year}
        </div>
      )}
      {data?.headline && (
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 600,
            color: "#992211",
            marginTop: 18,
            textAlign: "center",
          }}
        >
          {data.headline}
        </div>
      )}
    </div>
  );
}

const idParam = (v: string | null): number | null => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const [a, b] = await Promise.all([
    loadSide(idParam(url.searchParams.get("a"))),
    loadSide(idParam(url.searchParams.get("b"))),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          fontFamily: "sans-serif",
          padding: "56px 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#992211",
          }}
        >
          STEVENS TRACK & FIELD · HEAD TO HEAD
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "flex-start", justifyContent: "space-between" }}>
          <Panel data={a} />
          <div
            style={{
              display: "flex",
              width: 92,
              height: 92,
              marginTop: PHOTO / 2 - 46,
              borderRadius: 46,
              background: "#992211",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#ffffff" }}>VS</div>
          </div>
          <Panel data={b} />
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#a1a1aa", letterSpacing: 1 }}>
          stevens-stats.com/compare
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // dynamic (not build-time), so let Vercel's edge cache absorb repeat
      // fetches for the same pairing — link-preview crawlers refetch a lot.
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
