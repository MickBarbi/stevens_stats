import { ImageResponse } from "next/og";
import { athletes } from "@/lib/data";
import { getAthlete, ogHeadline, ogInitials, ogPhotoUrl, ogYearLabel } from "@/lib/ogCard";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Stevens Stats — athlete card";
export const dynamicParams = false;

export function generateStaticParams() {
  return athletes.map((a) => ({ athleteId: String(a.athlete_id) }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const id = Number((await params).athleteId);
  const a = getAthlete(id);

  const name = a ? `${a.nickname ?? a.first_name} ${a.last_name}` : "Athlete";
  const year = a ? ogYearLabel(a) : "";
  const headline = a ? ogHeadline(id, a.sex) : "";
  const photo = a ? await ogPhotoUrl(a, 480, 630) : null;
  const initials = a ? ogInitials(a) : "SS";

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
