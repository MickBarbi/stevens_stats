# data/

The site's entire dataset. `lib/data.ts` imports these at build time; there is
no database. Files are small enough to keep in git — the history *is* the backup.

## Scraper-generated (do not hand-edit)

`scraper/load.py` overwrites these on every run:

| File | Contents |
|---|---|
| `athletes.json` | One entry per athlete. `first_name`, `last_name`, `year`, `sex`, `active` come from the roster scrape. `nickname`, `bio`, `image_path`, `graduation_year`, `awards` are **preserved** across re-scrapes — edit those here. `"active": false` = a former athlete (dropped off the roster, or an alumnus backfilled via `scraper/rosters.txt`); they get an `/athlete` page and Top 10 links but are hidden from the roster / events / feed. |

Roster photos are served from Cloudinary with the athlete's **TFRRS id** as the
`public_id` (e.g. `8327859.webp`). Set `image_path` on an athlete only to point
at a differently-named upload; leave it `null` otherwise.
| `events.json` | The 33 events (`event_id`, `event_name`, `event_season`). |
| `performances.json` | Every result, with `is_personal_best` / `is_collegiate_best` / `is_overall_best` / `is_season_best` flags. `mark` is unit-less (track = seconds, field = metres, multis = points). |

Regenerate:

```bash
python scraper/roster.py && python scraper/history.py && python scraper/load.py
```

## Hand-maintained

`load.py` creates these empty if missing and never overwrites them:

**`qualifying_standards.json`** — array of:

```json
{
  "event_id": 6,
  "gender": "m",
  "season": "indoor",
  "mac_qualifying_standard": 115.5,
  "aartfc_qualifying_standard": 113.0
}
```

- `gender` is `"m"` / `"f"`, `season` is `"indoor"` / `"outdoor"` — one row per
  combination.
- Marks use the same unit-less convention as `performances.json`.
- A row with **both** standards `null` marks the event as *not contested* at MAC
  / AARTFC for that season+gender; the events page shows a note instead of
  standard values. One `null` (and one number) just means that meet has no
  standard for it.
- On the events page an athlete's name turns blue if their best for the selected
  season clears the AARTFC standard, red if it clears the MAC standard.

The events page opens on the current season (indoor Dec–Feb, outdoor otherwise);
`lib/data.ts` `currentSeason()` sets the boundary.

**`blog_posts.json`** — array of:

```json
{
  "post_id": 1,
  "title": "...",
  "subheading": "...",
  "body": "...",
  "author": "...",
  "created_on": "2026-01-15"
}
```

`post_id` must be unique; `created_on` is `YYYY-MM-DD` (newest sorts first).

**`top10.json`** — the official all-time top-10 lists. This is the source of
truth for "team rank" (the scraped data only covers the current roster, so it
can't rank against alumni or handle relays). Array of:

```json
{
  "event_id": 6,
  "event_name": "800 Meters",
  "gender": "m",
  "season": "indoor",
  "relay": false,
  "entries": [
    { "rank": 1, "athlete_id": 7892451, "name": "Jake Porco",
      "mark": "1:52.34", "date": "2023-02-18",
      "link": "https://www.tfrrs.org/results/..." },
    { "rank": 2, "athlete_id": null, "name": "Older Alum",
      "mark": "1:53.10", "date": "2015-03-01" }
  ]
}
```

- `event_id` — the numeric id from `events.json` for individual events; `null`
  for relays. `event_name` is always shown as-is.
- `gender` is `"m"` / `"f"`, `season` is `"indoor"` / `"outdoor"`.
- Relay lists: `"relay": true`. Each entry has no `name` / `athlete_id` / `date`;
  instead it has `"members": [{ "name": "A", "athlete_id": 123 | null }, …]` (one
  per leg, each linked to `/athlete/<id>` when that runner is on the current
  site) and `"year"` — a relay is tracked once per season regardless of lineup.
- `athlete_id` (individual entries) links to `/athlete/<id>` when that person is
  on the current site; `null` for anyone not in the system.
- `link` (optional) makes the mark a link to the result. `mark` is the string
  as written on the official list. `date` is `YYYY-MM-DD` (individual entries).
- This file is generated from the official Excel lists (see
  `scraper/`-adjacent one-off scripts / the conversion in the redesign log) but
  is committed as data and can be hand-edited.
- Powers the `/records` page, the "Team Rank" columns on the events and athlete
  pages, and the "SR" badge (rank 1) on the home feed / athlete page.
