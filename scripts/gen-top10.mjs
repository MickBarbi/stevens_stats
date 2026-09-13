// Build the client-fetchable copy of the all-time top-10 board.
//   node scripts/gen-top10.mjs
// Produces public/top10.json — the same shape as data/top10.json, but with
// each individual entry's TFRRS result link attached (mirrors the enrichment
// block in lib/data.ts; duplicated here because this script can't import TS).
//
// /records used to get this whole thing as a page prop (216 KB serialized
// straight into the page's JS/RSC payload — the heaviest route on the site).
// It's fetched client-side instead now, same as search-index/compare-data/
// calendar/progression, and cached by the service worker after first load.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const topTen = read("data/top10.json");
const performances = read("data/performances.json");

const toSeconds = (raw) => {
  const t = String(raw).replace(/[^\d:.]/g, "");
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    return Number(m) * 60 + Number(s);
  }
  return Number(t);
};
const dayGap = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

const perfByAthleteEvent = new Map();
for (const p of performances) {
  const k = `${p.athlete_id}|${p.event_id}`;
  const bucket = perfByAthleteEvent.get(k);
  if (bucket) bucket.push(p);
  else perfByAthleteEvent.set(k, [p]);
}

for (const list of topTen) {
  if (list.relay || list.event_id == null) continue;
  for (const e of list.entries) {
    if (e.link || !e.athlete_id || !e.date) continue;
    const cands = perfByAthleteEvent.get(`${e.athlete_id}|${list.event_id}`);
    if (!cands) continue;
    const target = toSeconds(e.mark);
    const match = cands
      .filter(
        (p) =>
          p.result_link != null &&
          Math.abs(p.mark - target) <= 0.03 &&
          dayGap(p.date, e.date) <= 3
      )
      .sort((a, b) => dayGap(a.date, e.date) - dayGap(b.date, e.date))[0];
    if (match) e.link = match.result_link ?? undefined;
  }
}

const out = join(root, "public/top10.json");
writeFileSync(out, JSON.stringify(topTen));
console.log(
  `wrote public/top10.json (${topTen.length} lists, ${(
    Buffer.byteLength(JSON.stringify(topTen)) / 1024
  ).toFixed(0)} KB)`
);
