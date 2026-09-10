import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Stevens Stats — Stevens track & field results, rosters and records";

// The nav logo, inlined so Satori can render it at build time.
const LOGO = `data:image/jpeg;base64,${readFileSync(
  join(process.cwd(), "public", "Designer.jpeg")
).toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 76,
          background: "linear-gradient(135deg, #a3260f 0%, #7d1c0e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO}
            width={128}
            height={96}
            alt=""
            style={{ borderRadius: 16, objectFit: "cover" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 25, letterSpacing: 4, opacity: 0.82 }}>
              STEVENS INSTITUTE OF TECHNOLOGY
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 33,
                fontWeight: 700,
                letterSpacing: 3,
                marginTop: 4,
              }}
            >
              TRACK &amp; FIELD
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 132, fontWeight: 800, lineHeight: 1 }}>
            Stevens Stats
          </div>
          <div style={{ display: "flex", fontSize: 39, marginTop: 24, opacity: 0.92 }}>
            Meet results · Rosters · All-time Top 10 · Season progression
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, opacity: 0.78, letterSpacing: 1 }}>
          stevens-stats.com
        </div>
      </div>
    ),
    { ...size }
  );
}
