# scraper/ — Stevens Stats data collection

One scraper, run on a schedule, that rebuilds the whole dataset from TFRRS.

There is **no incremental "after each meet" step**. TFRRS keeps every athlete's
full career history on their profile page, so each run re-scrapes everything and
recomputes the bests from scratch. That removes a whole class of bugs the old
tools had (missed meets, meet-name matching, indoor marks leaking into outdoor
records, running-best ordering).

```
roster.py   team pages ─────────────► data/roster_raw.csv
history.py  each athlete's page ─────► data/performances_raw.csv
load.py     the two files above  ────► data/athletes.csv  data/events.csv
                                       data/performances.csv
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
python roster.py                 # ~90 athletes, a few seconds
python history.py                # one page per athlete, ~2 sec each (be patient)
python load.py                   # writes the 3 import-ready CSVs
python load.py --push            # also writes them into SQL Server
```

Handy flags while developing:

```bash
python history.py --limit 5              # smoke test on 5 athletes
python history.py --ids 8327859 7892451  # specific athletes
python history.py --resume               # continue an interrupted run
python load.py --since 2025-09-01         # season-best cutoff (see below)
```

### Backfilling alumni

Past-season roster pages have their own (unguessable) TFRRS URLs. Paste them,
one per line, into `scraper/rosters.txt`:

```
m  https://www.tfrrs.org/.../roster/...     # men's indoor 2023
f  https://www.tfrrs.org/.../roster/...     # women's outdoor 2022
```

Then re-run:

```bash
python roster.py            # current + rosters.txt -> roster_raw.csv (adds an `active` col)
python history.py --resume  # scrape only the newly-added ids
python load.py              # rebuild; alumni come out as active:false
python top10_from_xlsx.py <xlsx>   # re-link the record board to the new profiles
```

Alumni get an `/athlete/<id>` page and Top 10 links but stay out of the roster,
events leaderboards and home feed (those filter on `active`). Add a
`graduation_year` by hand in `data/athletes.json` if you want it shown — the
merge preserves it.

## What the files contain

`load.py` produces rows that match `stevens_stats/prisma/schema.prisma` exactly:

- **athletes.csv** — `athlete_id` is the TFRRS id. `year` is the class year as an
  int (FR=1 … 5). `active` is 1 for the current roster, 0 for alumni pulled in
  via `rosters.txt` (see *Backfilling alumni*). `--push` MERGEs these, sets
  `active = 0` for anyone no longer scraped, and **never touches** `nickname`,
  `bio`, `image_path` or `graduation_year`, so anything you edit through the
  site survives a re-scrape.
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
