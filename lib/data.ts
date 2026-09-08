// Build-time data access for the static site. Everything here is read from the
// JSON files in /data, which the scraper (scraper/load.py) regenerates. No
// database and no network at request time — pages import these helpers and Next
// prerenders every route.

import athletesJson from "@/data/athletes.json";
import eventsJson from "@/data/events.json";
import performancesJson from "@/data/performances.json";
import standardsJson from "@/data/qualifying_standards.json";
import postsJson from "@/data/blog_posts.json";

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

export const athletes = athletesJson as unknown as Athlete[];
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

export const athletePickerList = (): PickerAthlete[] =>
  activeAthletes().map(({ athlete_id, first_name, last_name, nickname }) => ({
    athlete_id,
    first_name,
    last_name,
    nickname,
  }));

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
