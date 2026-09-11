// Build the "on this day" calendar for the home page.
//   node scripts/gen-calendar.mjs
// Produces:
//   public/calendar.json   { "MM-DD": [ { y, id, n, e, m, hib, pb, sr, meet } ] }
//
// One map keyed by month-day so a client component can show *today's* history
// without a rebuild. Only notable-ish marks are kept and only ~6 per day.
// Fetched once on the home page and cached by the service worker.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const athletes = read("data/athletes.json");
const performances = read("data/performances.json");
const events = read("data/events.json");
const topTen = read("data/top10.json");

const evName = new Map(events.map((e) => [e.event_id, e.event_name]));
const athById = new Map(athletes.map((a) => [a.athlete_id, a]));

// mark display (mirrors lib/format.ts)
const markKind = (id) =>
  id >= 27 && id <= 29 ? "points" : id >= 18 && id <= 26 ? "distance" : "time";
const fmtMark = (v, kind) => {
  if (kind === "points") return String(Math.round(v));
  if (kind === "time" && v >= 60) {
    const m = Math.floor(v / 60);
    return `${m}:${(v - m * 60).toFixed(2).padStart(5, "0")}`;
  }
  return v.toFixed(2);
};

// team rank (mirrors lib/data.ts teamRank)
const topIdx = new Map();
for (const l of topTen) {
  if (l.event_id != null && !l.relay) {
    topIdx.set(`${l.event_id}|${l.gender}|${l.season}`, l);
  }
}
const isSR = (athleteId, eventId, season, gender) => {
  if (!gender) return false;
  const list = topIdx.get(
    `${eventId}|${gender}|${season === "i" ? "indoor" : "outdoor"}`
  );
  const e = list?.entries.find((x) => x.athlete_id === athleteId);
  return e?.rank === 1;
};

// meet identity (mirrors lib/data.ts)
const MEET_LINK_RE = /tfrrs\.org\/results\/(\d+)\/\d+\/([^/]+)\//;
const cleanMeetName = (s) =>
  decodeURIComponent(s)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bTF\b/g, "Track & Field")
    .replace(/\bTrack Field\b/g, "Track & Field")
    .trim();
const meetSlug = (id, name) =>
  `${id}-${name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
const parseMeet = (link) => {
  const m = link && link.match(MEET_LINK_RE);
  if (!m) return null;
  const name = cleanMeetName(m[2]);
  return { name, slug: meetSlug(m[1], name) };
};

const byDay = new Map(); // "MM-DD" -> Performance[]
for (const p of performances) {
  const k = p.date.slice(5); // MM-DD
  const arr = byDay.get(k);
  if (arr) arr.push(p);
  else byDay.set(k, [p]);
}

// One headline per year — "on this day, N years ago" reads best as a spread
// across the program's history, not six sub-marks from last spring. The
// headline is the day's most notable mark that year: school record > lifetime
// best > personal best > season best > anything else.
const out = {};
for (const [day, list] of byDay) {
  const byYear = new Map(); // year -> { t, row }
  for (const p of list) {
    const a = athById.get(p.athlete_id);
    if (!a) continue;
    const sex = a.sex ? a.sex.toLowerCase() : null;
    const sr = isSR(p.athlete_id, p.event_id, p.season, sex) && p.is_overall_best;
    const t = sr
      ? 0
      : p.is_overall_best
        ? 1
        : p.is_personal_best
          ? 2
          : p.is_season_best
            ? 3
            : 4;
    const year = Number(p.date.slice(0, 4));
    const cur = byYear.get(year);
    if (cur && cur.t <= t) continue;
    byYear.set(year, {
      t,
      row: {
        y: year,
        id: p.athlete_id,
        n: `${a.nickname || a.first_name} ${a.last_name}`,
        e: evName.get(p.event_id) ?? String(p.event_id),
        m: fmtMark(p.mark, markKind(p.event_id)),
        pb: p.is_personal_best ? 1 : 0,
        sr: sr ? 1 : 0,
        meet: parseMeet(p.result_link),
      },
    });
  }
  const rows = [...byYear.values()]
    .sort((a, b) => a.t - b.t || b.row.y - a.row.y) // keep the 6 most notable years
    .slice(0, 6)
    .sort((a, b) => b.row.y - a.row.y) // ...but show newest first
    .map((x) => x.row);
  if (rows.length) out[day] = rows;
}

writeFileSync(
  join(root, "public", "calendar.json"),
  JSON.stringify(out) + "\n"
);

const bytes = readFileSync(join(root, "public", "calendar.json")).length;
console.log(
  `wrote public/calendar.json (${Object.keys(out).length} days, ${(bytes / 1024).toFixed(0)} KB)`
);
