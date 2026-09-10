// Build-time data access for the static site. Everything here is read from the
// JSON files in /data, which the scraper (scraper/load.py) regenerates. No
// database and no network at request time — pages import these helpers and Next
// prerenders every route.

import athletesJson from "@/data/athletes.json";
import eventsJson from "@/data/events.json";
import performancesJson from "@/data/performances.json";
import standardsJson from "@/data/qualifying_standards.json";
import postsJson from "@/data/blog_posts.json";
import topTenJson from "@/data/top10.json";
import { alumniLabel, isFormerAthlete } from "./athlete";

// Re-exported so existing server-side imports keep working. Client components
// import these straight from "@/lib/athlete" instead, so they don't drag this
// module's JSON into their bundle.
export { alumniLabel, isFormerAthlete };

export type Athlete = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  year: number;
  sex: string | null;
  active: boolean;
  nickname: string | null;
  bio: string | null;
  image_path: string | null;
  graduation_year: number | null;
  awards: string[];
  // former athletes only, hand-set in athletes.json:
  // "graduated" | "left" | "transferred" | null
  status: string | null;
};


export type EventInfo = {
  event_id: number;
  event_name: string;
  event_season: string; // "Indoor" | "Outdoor" | "Both"
  higher_is_better: boolean; // jumps / throws / multis; false for races
};

export type Performance = {
  performance_id: number;
  athlete_id: number;
  event_id: number;
  mark: number;
  season: string; // "i" | "o"
  date: string; // YYYY-MM-DD
  result_link: string | null;
  ranking: number | null;
  is_personal_best: boolean;
  is_collegiate_best: boolean;
  is_overall_best: boolean;
  is_season_best: boolean;
};

export type QualifyingStandard = {
  event_id: number;
  gender: string;
  season: string;
  mac_qualifying_standard: number | null;
  aartfc_qualifying_standard: number | null;
};

export type BlogPost = {
  post_id: number;
  title: string;
  subheading: string;
  body: string;
  author: string;
  created_on: string;
};

// `sex` is stored "M"/"F" but every comparison (filters, top10.json,
// qualifying_standards.json, the dropdowns) uses "m"/"f" — normalise on load.
export const athletes = (athletesJson as unknown as Athlete[]).map((a) => ({
  ...a,
  sex: a.sex ? a.sex.toLowerCase() : null,
}));
export const events = eventsJson as unknown as EventInfo[];
export const performances = performancesJson as unknown as Performance[];
export const qualifyingStandards = standardsJson as unknown as QualifyingStandard[];
export const blogPosts = postsJson as unknown as BlogPost[];

const eventNameById = new Map(events.map((e) => [e.event_id, e.event_name]));
const higherIsBetterById = new Map(events.map((e) => [e.event_id, e.higher_is_better]));

// Canonical meet running order: track short->long, then hurdles, then the
// steeple, then the field events (jumps, throws) and finally the multis.
// events.json's ids are almost this order already; this list also slots the
// few out-of-sequence add-ons (55 / 300 / 500 m, 55 H) into their real place.
const EVENT_ORDER = new Map<number, number>(
  [
    1, 32, 2, 3, 30, 4, 31, 5, 6, 7, 8, 9, 10, 11, 12, 13, 33, 14, 15, 16, 17,
    18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  ].map((id, i) => [id, i])
);
const eventOrder = (id: number): number => EVENT_ORDER.get(id) ?? 99;

const byName = (a: { last_name: string; first_name: string }, b: typeof a) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);

export const activeAthletes = (): Athlete[] =>
  athletes.filter((a) => !isFormerAthlete(a)).sort(byName);

export const getAthlete = (id: number): Athlete | null =>
  athletes.find((a) => a.athlete_id === id) ?? null;

export type PickerAthlete = Pick<
  Athlete,
  | "athlete_id"
  | "first_name"
  | "last_name"
  | "nickname"
  | "active"
  | "status"
  | "image_path"
>;

const toPicker = ({
  athlete_id,
  first_name,
  last_name,
  nickname,
  active,
  status,
  image_path,
}: Athlete): PickerAthlete => ({
  athlete_id,
  first_name,
  last_name,
  nickname,
  active,
  status,
  image_path,
});

// Everyone, current team first then former athletes — each block alphabetical.
export const athletePickerList = (): PickerAthlete[] =>
  [...athletes]
    .sort(
      (a, b) => Number(isFormerAthlete(a)) - Number(isFormerAthlete(b)) || byName(a, b)
    )
    .map(toPicker);

/** Previous / next athlete in the roster order (wraps around). */
export const adjacentActiveAthletes = (
  id: number
): { prev: PickerAthlete | null; next: PickerAthlete | null } => {
  const list = activeAthletes();
  const i = list.findIndex((a) => a.athlete_id === id);
  if (i === -1 || list.length < 2) return { prev: null, next: null };
  return {
    prev: toPicker(list[(i - 1 + list.length) % list.length]),
    next: toPicker(list[(i + 1) % list.length]),
  };
};

export type ProgressionPerformance = Performance & {
  event_name: string;
  higher_is_better: boolean;
};

export const progressionForAthlete = (id: number): ProgressionPerformance[] =>
  performances
    .filter((p) => p.athlete_id === id)
    .map((p) => ({
      ...p,
      event_name: eventNameById.get(p.event_id) ?? String(p.event_id),
      higher_is_better: higherIsBetterById.get(p.event_id) ?? false,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

// ---- Roster cards -----------------------------------------------------------
// One entry per active athlete, carrying just what the roster card needs:
// the events they're known for, their PB in each event (for the "filter by
// event" mini-leaderboard), and whether their most recent result was a best.

export type RosterMark = { event_id: number; mark: number };

export type RosterEntry = {
  athlete: Athlete;
  specialties: { event_id: number; event_name: string }[];
  recentBest: boolean;
  marks: RosterMark[];
};

export const rosterEntries = (): RosterEntry[] => {
  const byAthlete = new Map<number, Performance[]>();
  for (const p of performances) {
    const arr = byAthlete.get(p.athlete_id);
    if (arr) arr.push(p);
    else byAthlete.set(p.athlete_id, [p]);
  }

  // everyone — the roster page filters current / alumni / all
  return [...athletes].sort(byName).map((athlete) => {
    const ps = byAthlete.get(athlete.athlete_id) ?? [];

    const count = new Map<number, number>();
    for (const p of ps) count.set(p.event_id, (count.get(p.event_id) ?? 0) + 1);
    const specialties = Array.from(count.entries())
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 3)
      .map(([event_id]) => ({
        event_id,
        event_name: eventNameById.get(event_id) ?? String(event_id),
      }));

    const marks: RosterMark[] = ps
      .filter((p) => p.is_personal_best)
      .map((p) => ({ event_id: p.event_id, mark: p.mark }));

    // "on a high note" — a current athlete whose most recent result was a
    // lifetime PB. Not meaningful for alumni (their career already ended).
    let recentBest = false;
    if (!isFormerAthlete(athlete) && ps.length) {
      const latest = ps.reduce((a, b) => (b.date > a.date ? b : a));
      recentBest = latest.is_personal_best;
    }

    return { athlete, specialties, recentBest, marks };
  });
};

// ---- Events leaderboard -------------------------------------------------------
// One row per athlete per event, carrying only the marks the events page shows.
// Built from the flagged performances; indoor vs. outdoor comes from each row's
// own `season`.

export type BestCell = {
  mark: number;
  date: string;
  result_link: string | null;
  ranking: number | null;
} | null;

export type LeaderboardRow = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  sex: string | null;
  indoor_best: BestCell;
  outdoor_best: BestCell;
  indoor_season_best: BestCell;
  outdoor_season_best: BestCell;
  collegiate_best: BestCell;
  personal_best: BestCell;
  // all-time team-list place for this event, precomputed so the client page
  // doesn't need teamRank() (and this module's data) in its bundle
  rank_indoor: number | null;
  rank_outdoor: number | null;
};

export type LeaderboardEvent = EventInfo & { rows: LeaderboardRow[] };

const cell = (p: Performance): BestCell => ({
  mark: p.mark,
  date: p.date,
  result_link: p.result_link,
  ranking: p.ranking,
});

export const eventLeaderboard = (): LeaderboardEvent[] => {
  const activeIds = new Set(activeAthletes().map((a) => a.athlete_id));
  const athleteById = new Map(athletes.map((a) => [a.athlete_id, a]));
  const groups = new Map<number, LeaderboardEvent>();

  for (const p of performances) {
    if (!activeIds.has(p.athlete_id)) continue;
    if (
      !p.is_overall_best &&
      !p.is_season_best &&
      !p.is_collegiate_best &&
      !p.is_personal_best
    ) {
      continue;
    }

    let group = groups.get(p.event_id);
    if (!group) {
      const info = eventNameById.has(p.event_id)
        ? events.find((e) => e.event_id === p.event_id)!
        : {
            event_id: p.event_id,
            event_name: String(p.event_id),
            event_season: "Both",
            higher_is_better: false,
          };
      group = { ...info, rows: [] };
      groups.set(p.event_id, group);
    }

    let row = group.rows.find((r) => r.athlete_id === p.athlete_id);
    if (!row) {
      const a = athleteById.get(p.athlete_id)!;
      row = {
        athlete_id: a.athlete_id,
        first_name: a.first_name,
        last_name: a.last_name,
        nickname: a.nickname,
        sex: a.sex,
        indoor_best: null,
        outdoor_best: null,
        indoor_season_best: null,
        outdoor_season_best: null,
        collegiate_best: null,
        personal_best: null,
        rank_indoor: null,
        rank_outdoor: null,
      };
      group.rows.push(row);
    }

    const indoor = p.season === "i";
    if (p.is_overall_best) row[indoor ? "indoor_best" : "outdoor_best"] = cell(p);
    if (p.is_season_best) row[indoor ? "indoor_season_best" : "outdoor_season_best"] = cell(p);
    if (p.is_collegiate_best) row.collegiate_best = cell(p);
    if (p.is_personal_best) row.personal_best = cell(p);
  }

  const out = Array.from(groups.values()).sort((a, b) => a.event_id - b.event_id);
  for (const group of out) {
    for (const row of group.rows) {
      row.rank_indoor = teamRank(row.athlete_id, group.event_id, "indoor", row.sex);
      row.rank_outdoor = teamRank(row.athlete_id, group.event_id, "outdoor", row.sex);
    }
  }
  return out;
};

// ---- Blog ------------------------------------------------------------------
export const sortedPosts = (): BlogPost[] =>
  [...blogPosts].sort((a, b) => b.created_on.localeCompare(a.created_on));

export const getPost = (id: number): BlogPost | null =>
  blogPosts.find((p) => p.post_id === id) ?? null;

// ---- Season -----------------------------------------------------------------
export type Season = "indoor" | "outdoor";

export const seasonName = (flag: string): Season =>
  flag === "i" ? "indoor" : "outdoor";

// Which season the events page defaults to. Indoor runs its core Dec-Feb;
// everything else (including the March outdoor openers) defaults to outdoor.
export const currentSeason = (date: Date = new Date()): Season =>
  [11, 0, 1].includes(date.getMonth()) ? "indoor" : "outdoor";

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

// ---- Official all-time top-10 lists ---------------------------------------
// Hand-maintained (data/top10.json). Includes events and athletes not in the
// scraped data (alumni, relays), so this — not the scraped performances — is
// the source of truth for "team rank". See data/README.md.

export type RelayMember = {
  name: string;
  athlete_id: number | null; // links to /athlete/<id> when the leg is in the system
};

export type TopTenEntry = {
  rank: number;
  athlete_id?: number | null; // individual: links to /athlete/<id> when in the system
  name?: string; // individual
  members?: RelayMember[]; // relay legs
  mark: string; // as written on the official list
  date?: string; // individual
  year?: number; // relay — tracked one per season, not one per lineup
  link?: string; // results page for the mark
  meet?: string;
};

export type TopTenList = {
  event_id: number | null; // null for relays
  event_name: string;
  gender: string; // "m" | "f"
  season: Season;
  relay: boolean;
  entries: TopTenEntry[];
};

export const topTen = topTenJson as unknown as TopTenList[];

// Attach the TFRRS results-page link to each individual entry, matched to a
// scraped performance by (athlete_id, event_id) + a near-exact mark, with the
// date as a tie-breaker (the official list and TFRRS sometimes disagree by a
// day or two on multi-day meets). Entries without a linked athlete or a
// matching scraped row just stay unlinked.
{
  const toSeconds = (raw: string): number => {
    const t = String(raw).replace(/[^\d:.]/g, "");
    if (t.includes(":")) {
      const [m, s] = t.split(":");
      return Number(m) * 60 + Number(s);
    }
    return Number(t);
  };
  const dayGap = (a: string, b: string) =>
    Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

  const perfByAthleteEvent = new Map<string, Performance[]>();
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
            dayGap(p.date, e.date!) <= 3
        )
        .sort((a, b) => dayGap(a.date, e.date!) - dayGap(b.date, e.date!))[0];
      if (match) e.link = match.result_link ?? undefined;
    }
  }
}

const topTenIndex = new Map<string, TopTenList>();
for (const list of topTen) {
  if (list.event_id != null && !list.relay) {
    topTenIndex.set(`${list.event_id}|${list.gender}|${list.season}`, list);
  }
}

/** The athlete's place on the official all-time list for this event, or null. */
export const teamRank = (
  athleteId: number,
  eventId: number,
  season: Season,
  gender: string | null
): number | null => {
  if (!gender) return null;
  const list = topTenIndex.get(`${eventId}|${gender}|${season}`);
  const entry = list?.entries.find((e) => e.athlete_id === athleteId);
  return entry ? entry.rank : null;
};

// ---- This season's highlights (Home strip) ------------------------------

export type SeasonRecord = {
  event_name: string;
  gender: string; // "m" | "f"
  season: Season;
  relay: boolean;
  name: string; // individual name, or "A, B, C, D" for a relay
  members: RelayMember[] | null;
  athlete_id: number | null;
  mark: string;
  date: string | null; // YYYY-MM-DD; null for relays (tracked by year)
  link: string | null;
};

const entrySeasonYear = (e: TopTenEntry): number | null => {
  if (e.date) {
    const d = new Date(`${e.date}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : seasonYearOf(d);
  }
  return e.year ?? null;
};

/** School records (all-time #1) set in the current season year, newest first,
 *  plus a count of every top-10 mark from the same season. Both are empty
 *  between seasons — the Home strip hides itself then. */
export const seasonHighlights = (
  now: Date = new Date()
): { seasonYear: number; records: SeasonRecord[]; topTenCount: number } => {
  const yr = currentSeasonYear(now);
  const records: SeasonRecord[] = [];
  let topTenCount = 0;

  for (const list of topTen) {
    for (const e of list.entries) {
      if (entrySeasonYear(e) !== yr) continue;
      topTenCount += 1;
      if (e.rank !== 1) continue;
      records.push({
        event_name: list.event_name,
        gender: list.gender,
        season: list.season,
        relay: list.relay,
        name: e.name ?? (e.members ?? []).map((m) => m.name).join(", "),
        members: e.members ?? null,
        athlete_id: e.athlete_id ?? null,
        mark: e.mark,
        date: e.date ?? null,
        link: e.link ?? null,
      });
    }
  }

  records.sort(
    (a, b) =>
      (b.date ?? "").localeCompare(a.date ?? "") ||
      a.event_name.localeCompare(b.event_name)
  );
  return { seasonYear: yr, records, topTenCount };
};

// ---- Meets ---------------------------------------------------------------
// Every meet Stevens has results from, recovered from the TFRRS results-page
// link carried on each performance:
//   tfrrs.org/results/<meetId>/<resultId>/<Meet_Name_Slug>/<Event-Slug>
// The <meetId> groups all of a meet's events; the name slug gives a readable
// title. In the scraped data each meet id maps to a single date.

const MEET_LINK_RE = /tfrrs\.org\/results\/(\d+)\/\d+\/([^/]+)\//;

const cleanMeetName = (rawSlug: string): string =>
  decodeURIComponent(rawSlug)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bTF\b/g, "Track & Field") // TFRRS abbreviates "Track & Field"
    .replace(/\bTrack Field\b/g, "Track & Field") // the "&" is dropped in some
    .trim();

const meetSlug = (meetId: string, name: string): string =>
  `${meetId}-${name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

/** Meet identity for one performance's results link, or null if it doesn't
 *  point at a TFRRS meet result. */
export const parseMeetLink = (
  link: string | null | undefined
): { meetId: string; name: string; slug: string } | null => {
  const m = link?.match(MEET_LINK_RE);
  if (!m) return null;
  const name = cleanMeetName(m[2]);
  return { meetId: m[1], name, slug: meetSlug(m[1], name) };
};

export type MeetResult = {
  performance_id: number;
  athlete_id: number;
  athlete_name: string;
  sex: string | null;
  event_id: number;
  event_name: string;
  higher_is_better: boolean;
  mark: number;
  season: string; // "i" | "o"
  pb_mark: number | null;
  is_personal_best: boolean;
  is_season_best: boolean;
  is_overall_best: boolean;
  team_rank: number | null; // all-time team-list place for the event/season
  result_link: string | null;
};

export type Meet = {
  slug: string;
  meet_id: string;
  name: string;
  date: string; // YYYY-MM-DD
  tfrrs_url: string;
  result_count: number;
  athlete_count: number;
  event_count: number;
  results: MeetResult[];
};

let _meets: Meet[] | null = null;

export const allMeets = (): Meet[] => {
  if (_meets) return _meets;

  const athleteById = new Map(athletes.map((a) => [a.athlete_id, a]));
  const pbByKey = new Map<string, number>();
  for (const p of performances) {
    if (p.is_personal_best) pbByKey.set(`${p.athlete_id}|${p.event_id}`, p.mark);
  }

  const groups = new Map<
    string,
    { meet_id: string; rawSlug: string; date: string; results: MeetResult[] }
  >();

  for (const p of performances) {
    const m = p.result_link?.match(MEET_LINK_RE);
    if (!m) continue;
    const [, meetId, rawSlug] = m;

    let g = groups.get(meetId);
    if (!g) {
      g = { meet_id: meetId, rawSlug, date: p.date, results: [] };
      groups.set(meetId, g);
    }
    if (p.date < g.date) g.date = p.date; // defensive; data has one date per meet

    const a = athleteById.get(p.athlete_id);
    g.results.push({
      performance_id: p.performance_id,
      athlete_id: p.athlete_id,
      athlete_name: a
        ? `${a.nickname ?? a.first_name} ${a.last_name}`
        : String(p.athlete_id),
      sex: a?.sex ?? null,
      event_id: p.event_id,
      event_name: eventNameById.get(p.event_id) ?? String(p.event_id),
      higher_is_better: higherIsBetterById.get(p.event_id) ?? false,
      mark: p.mark,
      season: p.season,
      pb_mark: pbByKey.get(`${p.athlete_id}|${p.event_id}`) ?? null,
      is_personal_best: p.is_personal_best,
      is_season_best: p.is_season_best,
      is_overall_best: p.is_overall_best,
      team_rank: teamRank(
        p.athlete_id,
        p.event_id,
        seasonName(p.season),
        a?.sex ?? null
      ),
      result_link: p.result_link,
    });
  }

  _meets = Array.from(groups.values())
    .map((g) => {
      const name = cleanMeetName(g.rawSlug);
      // One row per athlete per event: at championship meets TFRRS records a
      // separate mark for prelims and finals, and a "how did we do" recap wants
      // the athlete's best mark from the meet, not every round. Keep the best
      // mark's row but carry any best-flag that landed on another round.
      const best = new Map<string, MeetResult>();
      for (const r of g.results) {
        const k = `${r.athlete_id}|${r.event_id}`;
        const cur = best.get(k);
        const better =
          !cur || (r.higher_is_better ? r.mark > cur.mark : r.mark < cur.mark);
        const keep = better ? r : cur!;
        const drop = better ? cur : r;
        best.set(k, {
          ...keep,
          is_personal_best: keep.is_personal_best || !!drop?.is_personal_best,
          is_season_best: keep.is_season_best || !!drop?.is_season_best,
          is_overall_best: keep.is_overall_best || !!drop?.is_overall_best,
        });
      }
      const results = Array.from(best.values());
      return {
        slug: meetSlug(g.meet_id, name),
        meet_id: g.meet_id,
        name,
        date: g.date,
        tfrrs_url: `https://www.tfrrs.org/results/${g.meet_id}`,
        result_count: results.length,
        athlete_count: new Set(results.map((r) => r.athlete_id)).size,
        event_count: new Set(results.map((r) => r.event_id)).size,
        results,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));

  return _meets;
};

let _meetIdx: Map<string, Meet> | null = null;

export const meetBySlug = (slug: string): Meet | null => {
  if (!_meetIdx) _meetIdx = new Map(allMeets().map((m) => [m.slug, m]));
  return _meetIdx.get(slug) ?? null;
};

// ---- Latest results feed (home dashboard) --------------------------------

export type FeedResult = Performance & {
  athlete: PickerAthlete;
  event_name: string;
  higher_is_better: boolean;
  pb_mark: number | null; // athlete's all-time best for this event, for context
  team_rank: number | null;
  meet: { name: string; slug: string } | null;
};

export const latestResults = (limit = 60): FeedResult[] => {
  const activeById = new Map(activeAthletes().map((a) => [a.athlete_id, a]));

  const pbByKey = new Map<string, number>();
  for (const p of performances) {
    if (p.is_personal_best) pbByKey.set(`${p.athlete_id}|${p.event_id}`, p.mark);
  }

  return performances
    .filter((p) => activeById.has(p.athlete_id))
    .slice()
    // take the most recent `limit` marks by date...
    .sort((a, b) => b.date.localeCompare(a.date) || b.performance_id - a.performance_id)
    .slice(0, limit)
    // ...then, within each day, list them in the usual meet event order,
    // best mark first inside an event.
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        eventOrder(a.event_id) - eventOrder(b.event_id) ||
        (higherIsBetterById.get(a.event_id) ? b.mark - a.mark : a.mark - b.mark) ||
        a.performance_id - b.performance_id
    )
    .map((p) => {
      const a = activeById.get(p.athlete_id)!;
      const meet = parseMeetLink(p.result_link);
      return {
        ...p,
        athlete: toPicker(a),
        event_name: eventNameById.get(p.event_id) ?? String(p.event_id),
        higher_is_better: higherIsBetterById.get(p.event_id) ?? false,
        pb_mark: pbByKey.get(`${p.athlete_id}|${p.event_id}`) ?? null,
        team_rank: teamRank(p.athlete_id, p.event_id, seasonName(p.season), a.sex),
        meet: meet ? { name: meet.name, slug: meet.slug } : null,
      };
    });
};
