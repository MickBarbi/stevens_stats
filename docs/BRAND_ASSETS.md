# Brand assets — what to commission

Everything visual on the site right now is a **placeholder**: the nav badge and
PWA icons are AI-generated (`public/Designer.jpeg` → `public/icon-*.png`), and the
favicon is a quick hand-drawn duck (`app/icon.svg`). This is the spec for
replacing all of it with human-made work.

## Constraints to hand the designer

- **The mascot is a duck** ("Track the Quack"). Keep it a **generic** duck —
  Stevens' athletics teams are "the Ducks" and have their own registered mark;
  don't echo it. Same for the Stevens block "S": off limits, we're not
  affiliated with the school.
- **Brand colour:** maroon `#992211` on light, `#c8402f` on dark. The palette can
  change — if she proposes a full one, it maps to CSS variables in
  `app/globals.css` (three theme blocks) + `tailwind.config.ts`.
- **Type:** Geist Sans + Geist Mono today. Open to a change.
- **UI icons** (nav, buttons, empty states) come from `lucide-react`, an
  open-source set — those stay unless she wants to design a custom set.

## 1. Core brand — vector masters

SVG + editable source (Figma / Illustrator). For each: an **on-light**, an
**on-maroon**, and a **1-colour (mono)** version, plus clear-space + min-size.

| Asset | Use |
|---|---|
| **Duck mark** (icon only) | favicon, app icons, avatar, standalone stamp — must read at 16 px |
| **Primary logo** — wordmark + duck, horizontal lockup | the nav bar (`components/Navbar.tsx`) |
| **Stacked logo** — duck over wordmark | social cards, anything square-ish, print |
| **Wordmark only** — "Stevens Stats" text treatment | tight spaces |

## 2. Favicon & app icons — exact deliverables

Give the **duck-mark SVG** (must be legible at 16 px — solid shapes, no fine
detail); `scripts/gen-favicon.mjs` rebuilds the `.ico` and apple icon from it.
For the rest, exact PNGs:

| File | Size | Notes |
|---|---|---|
| `app/icon.svg` | vector | favicon; the duck mark, high contrast |
| `public/favicon.ico` | 16 / 32 / 48 | generated from the SVG — no need to hand-make |
| `app/apple-icon.png` | 180 × 180 | **no transparency, full-bleed** — iOS masks the corners |
| `public/icon-192.png` | 192 × 192 | Android / PWA |
| `public/icon-512.png` | 512 × 512 | PWA install, stores |
| `public/icon-maskable.png` | 512 × 512 | **maskable**: keep all content inside the centred 80 % (~410 px) safe circle; background fills the whole square |

## 3. Social share cards — 1200 × 630

Two cards, both currently generated in code:

- **Site card** (`app/opengraph-image.tsx`) — brand background, logo, "Stevens
  Stats", one-line tagline, `stevens-stats.com`. Shown when the site link is
  posted anywhere.
- **Athlete card** (`app/athlete/[athleteId]/opengraph-image.tsx`) — generated
  **per athlete**: headshot (or initials block) + name + class year + best event
  + PB. She designs the **template / layout**, not 500 images.

**Delivery options** (per card): a finished 1200 × 630 PNG (static, simplest); or
a background/frame PNG + a type spec (font, sizes, x/y positions) that the code
sets text into; or a full comp to rebuild in code.

**Technical limit:** these render through **Satori** (`next/og`), which supports
only a CSS subset — flexbox only (no grid), no text shadows, limited filters,
fonts must be supplied as files. A pixel-exact Figma-to-code rebuild has edges.
The background-PNG-plus-spec route is the least painful.

## 4. Optional — personality

- **Empty-state illustrations** — 4 small pieces (~400 × 300, transparent SVG or
  PNG) for "no results yet", "no team news", "offline", "page not found".
  Currently a plain `lucide` glyph in a dashed card.
- A dedicated **404** graphic.

## 5. General delivery

- Masters: SVG. Editable source alongside.
- Rasters at the **exact** pixel sizes above, sRGB, no ICC weirdness.
- Full-bleed (zero transparent margin): `apple-icon`, `icon-maskable`, both OG
  cards.
- Transparent background fine: the standalone duck mark, spot illustrations.
- File names matching the table above make the swap a drop-in.
