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

const byName = (a: { last_name: string; first_name: string }, b: typeof a) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);

export const activeAthletes = (): Athlete[] =>
  athletes.filter((a) => a.active).sort(byName);

export const getAthlete = (id: number): Athlete | null =>
  athletes.find((a) => a.athlete_id === id) ?? null;

export type PickerAthlete = Pick<
  Athlete,
  "athlete_id" | "first_name" | "last_name" | "nickname"
>;

const toPicker = ({ athlete_id, first_name, last_name, nickname }: Athlete): PickerAthlete => ({
  athlete_id,
  first_name,
  last_name,
  nickname,
});

export const athletePickerList = (): PickerAthlete[] => activeAthletes().map(toPicker);

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

  return activeAthletes().map((athlete) => {
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

    // "on a high note" — their most recent result was a lifetime PB
    let recentBest = false;
    if (ps.length) {
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
      };
      group.rows.push(row);
    }

    const indoor = p.season === "i";
    if (p.is_overall_best) row[indoor ? "indoor_best" : "outdoor_best"] = cell(p);
    if (p.is_season_best) row[indoor ? "indoor_season_best" : "outdoor_season_best"] = cell(p);
    if (p.is_collegiate_best) row.collegiate_best = cell(p);
    if (p.is_personal_best) row.personal_best = cell(p);
  }

  return Array.from(groups.values()).sort((a, b) => a.event_id - b.event_id);
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

// ---- Latest results feed (home dashboard) --------------------------------

export type FeedResult = Performance & {
  athlete: PickerAthlete;
  event_name: string;
  higher_is_better: boolean;
  pb_mark: number | null; // athlete's all-time best for this event, for context
  team_rank: number | null;
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
    .sort((a, b) => b.date.localeCompare(a.date) || b.performance_id - a.performance_id)
    .slice(0, limit)
    .map((p) => {
      const a = activeById.get(p.athlete_id)!;
      return {
        ...p,
        athlete: {
          athlete_id: a.athlete_id,
          first_name: a.first_name,
          last_name: a.last_name,
          nickname: a.nickname,
        },
        event_name: eventNameById.get(p.event_id) ?? String(p.event_id),
        higher_is_better: higherIsBetterById.get(p.event_id) ?? false,
        pb_mark: pbByKey.get(`${p.athlete_id}|${p.event_id}`) ?? null,
        team_rank: teamRank(p.athlete_id, p.event_id, seasonName(p.season), a.sex),
      };
    });
};
