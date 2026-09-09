# scraper/ — Stevens Stats data collection

One scraper that rebuilds the whole dataset from TFRRS.

TFRRS keeps every athlete's full career history on their profile page, and
`load.py` recomputes every best-flag from the full list each run, so there is no
"apply just this meet" step to get wrong (missed meets, meet-name matching,
indoor marks leaking into outdoor records, running-best ordering — all gone).

What *is* incremental is which athletes get re-fetched. `performances_raw.csv` is
a persistent cache; `history.py` re-scrapes only the active roster by default and
splices the results back in. Graduated athletes don't compete any more, so
there's no reason to pull a few hundred alumni pages every week. Run
`history.py --all` after a season ends for a full reconciliation.

```
roster.py   team pages (+ merge)  ───► data/roster_raw.csv
history.py  active athletes' pages ──► data/performances_raw.csv   (a persistent cache)
                                       data/scrape_state.json
load.py     the two files above  ────► data/athletes.csv  data/events.csv
                                       data/performances.csv  + ../data/*.json
            (--push) ───────────────► SQL Server (the site's database)
```

A "career best" is not its own table: it's a `performances` row with an
`is_*_best` flag set. `load.py` recomputes those flags from the full list every
run, so `performances` is the only thing that has to be loaded.

## Setup

```bash
cd scraper
python -m venv .venv && .venv\Scripts\activate      # optional
pip install -r requirements.txt                      # pyodbc only needed for --push
```

## Run

Run from anywhere (`python scraper/roster.py` from the repo root works too);
output always lands in `scraper/data/`, which is git-ignored.

```bash
python roster.py                 # ~90 current athletes + merges in known ids, a few sec
python history.py                # active roster only, ~1.5 sec/page
python history.py --all          # every athlete (full sweep — do this after each season)
python load.py                   # writes the 3 import-ready CSVs + the site JSON
python load.py --push            # also writes them into SQL Server
```

`history.py` selection:

```bash
python history.py                       # active=1 in roster_raw.csv (default)
python history.py --all                 # everyone in roster_raw.csv
python history.py --missing             # + anyone with no cached rows yet (backfill)
python history.py --stale 90            # + anyone not scraped in 90 days
python history.py --ids 8327859 7892451 # exactly these, ignore the roster
python history.py --limit 5             # first 5 of the selection (smoke test)
python history.py --resume              # skip ids already scraped today (resume a run)
python load.py --since 2025-09-01       # season-best cutoff (see below)
```

It writes `data/scrape_state.json` (`{athlete_id: {last_scraped, n}}`) alongside
the CSV; `--stale` and `--resume` read it. On a fatal error mid-run the cache is
flushed every 25 athletes, so `--resume` picks up where it stopped.

### Backfilling alumni

Past-season roster pages have their own (unguessable) TFRRS URLs. Paste them,
one per line, into `scraper/rosters.txt`:

```
m  https://www.tfrrs.org/.../roster/...     # men's indoor 2023
f  https://www.tfrrs.org/.../roster/...     # women's outdoor 2022
```

Then:

```bash
python roster.py                     # merges the new ids into roster_raw.csv
python history.py --missing --resume # scrape only the ids with no cached rows
python load.py                       # rebuild; alumni come out as active:false
python top10_from_xlsx.py <xlsx>     # re-link the record board to the new profiles
```

`roster.py` now **merges** with the existing `roster_raw.csv` (recomputing
`active` from the current team pages), so once you've scraped a season's URL once
you can delete it from `rosters.txt` and those athletes stay in the file. Pass
`--no-merge` for the old from-scratch behaviour. Alumni get an `/athlete/<id>`
page and Top 10 links but stay out of the roster, events leaderboards and home
feed (those filter on `active`). Fill in `graduation_year` / `status` / `bio` by
hand in `data/athletes.json` — the merge preserves them.

### Roster photos → Cloudinary

Separate from the TFRRS pipeline. Pulls headshots off the official Stevens site
(`stevensducks.com`, a Sidearm build) and uploads them to Cloudinary keyed by
TFRRS id, which is exactly what the site fetches
(`res.cloudinary.com/<cloud>/image/upload/.../<athlete_id>`) — so no code or
data change is needed once it runs.

```bash
python photos.py                 # scrape photo_rosters.txt, match names, download
python photos.py --dry-run       #   match + coverage report only
python photos_upload.py          # push data/photos/* to Cloudinary (overwrites)
python photos_upload.py --dry-run
python photos_upload.py --only 8919566,9251050
```

- `photo_rosters.txt` — the roster pages to scrape, **freshest first** (first
  page an athlete appears on wins). Track before cross-country; XC is the
  fallback headshot source for distance runners. URLs here *are* guessable
  (`/sports/{mens,womens}-track-and-field/roster/2023-24`), unlike TFRRS's.
- Name → id matching reuses the alias / accent-folding rules from
  `top10_from_xlsx.py`, plus a tiny `NAME_OVERRIDES` map in `photos.py` for
  preferred names that share no prefix (e.g. roster "Sarah" vs. data "Lillian").
  `photos.py` prints every athlete left without a photo and every roster name
  that matched nobody.
- `photos_upload.py` needs `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (plus
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`) in `../.env`. It uploads with
  `public_id=<athlete_id>`, `overwrite=True`, `invalidate=True`, and stores the
  athlete's name as the Cloudinary display name + context caption.
- Output (`data/photos/`, `data/photos_manifest.csv`) is git-ignored like the
  rest of `scraper/data/`.

## What the files contain

`load.py` produces rows that match `stevens_stats/prisma/schema.prisma` exactly:

- **athletes.csv** — `athlete_id` is the TFRRS id. `year` is the class year as an
  int (FR=1 … 5); set `year_override` in `data/athletes.json` to pin it when
  TFRRS is wrong (e.g. a 5th-year still listed SO-2). `active` is 1 for the
  current roster, 0 otherwise (see *Backfilling alumni*). The scrape owns
  `first_name`, `last_name`, `year`, `sex`, `active`; everything else in
  `athletes.json` (`nickname`, `bio`, `image_path`, `graduation_year`, `awards`,
  `status`, `year_override`) is hand-maintained and preserved across re-scrapes
  and `--push`.
- **events.csv** — the 33 reference rows, derived from the event map in
  `tfrrs.py`. Static; only changes if you add an event.
- **performances.csv** — one row per valid result, ever. `mark` is stored
  unit-less: track = seconds (`1:56.98` → `116.98`), field = metres, multis =
  points. `performance_id` is assigned deterministically (sorted by athlete,
  event, date, mark) so re-runs are stable. The four `is_*_best` columns mark
  which rows are that athlete's best for the event (see schema.prisma for what
  each means); indoor vs. outdoor is read from the row's own `season`. On
  `--push`, rows are MERGEd on `(athlete_id, event_id, date, mark, season)` —
  new rows inserted, existing rows' flags refreshed.

### Season-best cutoff (`--since`)

`is_season_best` marks the best mark on/after a cutoff date. Default is **Sept 1
of the current academic year**. A backfill run in the pre-season will
legitimately set `is_season_best` on nothing — that's correct, the season hasn't
started. Pass `--since YYYY-MM-DD` to override.

## Database connection for `--push`

`load.py` reads, in order:

1. `STEVENS_DATABASE_URL` — a Prisma `sqlserver://…` URL. You can point it at the
   site's own `DATABASE_URL`.
2. else `STEVENS_DB_SERVER` / `STEVENS_DB_NAME` / `STEVENS_DB_USER` /
   `STEVENS_DB_PASSWORD` (defaults to the local `MICKLAPTOP\TEW_SQLEXPRESS`
   instance the old tools used).

`STEVENS_DB_DRIVER` defaults to `ODBC Driver 17 for SQL Server`.

If you are not on SQL Server, skip `--push` and import the CSVs directly
(`BULK INSERT`, `prisma db seed`, `\copy`, etc.) — the column names line up.

## If TFRRS changes its HTML

Everything fragile is in `tfrrs.py`:

- `parse_roster` — looks for the team-page table whose header is `NAME | YEAR`.
- `parse_history` — reads the per-event tables inside `<div id="event-history">`;
  each row is `mark | meet | date` with a link to the meet result.
- `parse_mark`, `parse_meet_date` — cell-text clean-up (wind readings, date
  ranges like `Feb 28-Mar 1, 2025`).
- `EVENT_IDS` — event name → the site's `event_id`. Add new events here; the
  `Events` table is seeded from this map on `--push`.
- `HIGHER_IS_BETTER_EVENTS` — which events score "bigger is better" (jumps,
  throws, multis). Used when flagging bests.
