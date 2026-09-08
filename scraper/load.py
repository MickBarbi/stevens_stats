"""Turn the scraped CSVs into rows the website's database expects.

Reads   data/roster_raw.csv        (from roster.py)
        data/performances_raw.csv   (from history.py)

Writes  data/athletes.csv      athlete_id, first_name, last_name, year, sex, active
        data/events.csv        event_id, event_name, event_season
        data/performances.csv  performance_id, athlete_id, event_id, mark, season, date,
                               result_link, ranking,
                               is_personal_best, is_collegiate_best,
                               is_overall_best, is_season_best

There is no separate "bests" table any more. A career best is just a
Performances row with the matching is_*_best flag set, and those flags are
recomputed from the full performance list on every run (see schema.prisma).

Optional direct load into the site's SQL Server database:

    python load.py --push
        # connection from $STEVENS_DATABASE_URL (a Prisma sqlserver:// URL, e.g.
        # the site's own DATABASE_URL) or the $STEVENS_DB_* vars below.
        # - MERGEs Events and Athletes (never touches nickname/bio/image_path/
        #   graduation_year; sets active=0 for anyone no longer on the roster)
        # - MERGEs Performances on their natural key, refreshing the flags
"""

from __future__ import annotations

import argparse
import csv
import os
import pathlib
import sys
from collections import defaultdict
from datetime import date
from decimal import Decimal

import tfrrs

DATA_DIR = pathlib.Path(__file__).resolve().parent / "data"

_CENTS = Decimal("0.01")
_FLAGS = ("is_personal_best", "is_collegiate_best", "is_overall_best", "is_season_best")


def mark_key(value) -> str:
    """Canonical 2-dp string for a mark, so scraped Decimals and values read
    back from a Decimal(10,2) column compare equal (e.g. 4321 vs 4321.00)."""
    return str(Decimal(value).quantize(_CENTS))


# ---------------------------------------------------------------------------
# roster_raw -> athletes
# ---------------------------------------------------------------------------
_YEAR_PREFIX = {"FR": 1, "SO": 2, "JR": 3, "SR": 4, "GR": 5, "5T": 5}


def class_year_to_int(token: str | None) -> int:
    """'SR-4' -> 4, 'FR-1' -> 1, '' -> 1."""
    if not token:
        return 1
    token = token.strip().upper()
    if "-" in token:
        tail = token.split("-", 1)[1].strip()
        if tail.isdigit():
            return int(tail)
    return _YEAR_PREFIX.get(token[:2], 1)


def load_athletes(roster_csv: pathlib.Path) -> list[dict]:
    if not roster_csv.exists():
        sys.exit(f"missing {roster_csv} (run roster.py)")
    out = []
    with roster_csv.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            out.append({
                "athlete_id": int(row["athlete_id"]),
                "first_name": row["first_name"].strip()[:50],
                "last_name": row["last_name"].strip()[:50],
                "year": class_year_to_int(row.get("class_year")),
                "sex": (row.get("sex") or "").strip()[:1] or None,
                "active": True,
            })
    return out


# ---------------------------------------------------------------------------
# performances_raw -> performances (deduped, with a stable performance_id)
# ---------------------------------------------------------------------------
def load_performances(perf_csv: pathlib.Path, known_athletes: set[int]) -> list[dict]:
    if not perf_csv.exists():
        sys.exit(f"missing {perf_csv} (run history.py)")

    seen: set[tuple] = set()
    rows: list[dict] = []
    dropped_unknown = 0
    with perf_csv.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            athlete_id = int(r["athlete_id"])
            if known_athletes and athlete_id not in known_athletes:
                dropped_unknown += 1
                continue
            event_id = int(r["event_id"])
            mark = Decimal(r["mark"]).quantize(_CENTS)
            season = r["season"].strip()[:1]
            d = r["date"].strip()
            key = (athlete_id, event_id, mark_key(mark), season, d)
            if key in seen:
                continue
            seen.add(key)
            row = {
                "athlete_id": athlete_id,
                "event_id": event_id,
                "mark": mark,
                "season": season,
                "date": d,
                "result_link": (r.get("result_link") or "").strip() or None,
                "ranking": None,
            }
            for flag in _FLAGS:
                row[flag] = False
            rows.append(row)

    # Deterministic ids so re-runs stay consistent.
    rows.sort(key=lambda x: (x["athlete_id"], x["event_id"], x["date"], x["mark"]))
    for i, row in enumerate(rows, start=1):
        row["performance_id"] = i

    if dropped_unknown:
        print(f"  note: {dropped_unknown} performance rows skipped (athlete not on current roster)")
    return rows


# ---------------------------------------------------------------------------
# Flag the career-best rows in place.  Pure function of the performance list.
# ---------------------------------------------------------------------------
def default_season_start(today: date | None = None) -> str:
    """Sept 1 of the current academic year, as ISO."""
    today = today or date.today()
    year = today.year if today.month >= 9 else today.year - 1
    return f"{year}-09-01"


def flag_bests(performances: list[dict], season_start: str) -> int:
    groups: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for p in performances:
        groups[(p["athlete_id"], p["event_id"])].append(p)

    n_groups = 0
    for (athlete_id, event_id), rows in groups.items():
        higher_is_better = event_id in tfrrs.HIGHER_IS_BETTER_EVENTS
        best_of = (max if higher_is_better else min)

        def pick(subset: list[dict]) -> dict | None:
            return best_of(subset, key=lambda r: r["mark"]) if subset else None

        pb = pick(rows)
        if pb is None:
            continue
        n_groups += 1
        pb["is_personal_best"] = True
        pb["is_collegiate_best"] = True   # every TFRRS college mark counts
        for season in ("i", "o"):
            in_season = [r for r in rows if r["season"] == season]
            ob = pick(in_season)
            if ob:
                ob["is_overall_best"] = True
            sb = pick([r for r in in_season if r["date"] >= season_start])
            if sb:
                sb["is_season_best"] = True
    return n_groups


# ---------------------------------------------------------------------------
# CSV output
# ---------------------------------------------------------------------------
def _cell(value):
    if value is None:
        return ""
    if value is True:
        return 1
    if value is False:
        return 0
    return value


def _write(path: pathlib.Path, header: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow({k: _cell(row.get(k)) for k in header})
    print(f"  wrote {len(rows):>5}  {path}")


def write_csvs(out_dir: pathlib.Path, athletes, events, performances) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    _write(out_dir / "athletes.csv",
           ["athlete_id", "first_name", "last_name", "year", "sex", "active"], athletes)
    _write(out_dir / "events.csv",
           ["event_id", "event_name", "event_season"],
           [{"event_id": e, "event_name": n, "event_season": s} for e, n, s in events])
    _write(out_dir / "performances.csv",
           ["performance_id", "athlete_id", "event_id", "mark", "season", "date",
            "result_link", "ranking", *_FLAGS], performances)


# ---------------------------------------------------------------------------
# Optional: push straight into the site's SQL Server database
# ---------------------------------------------------------------------------
def _sqlserver_conn_str() -> str:
    url = os.environ.get("STEVENS_DATABASE_URL", "").strip()
    driver = os.environ.get("STEVENS_DB_DRIVER", "ODBC Driver 17 for SQL Server")
    if url.startswith("sqlserver://"):
        body = url[len("sqlserver://"):]
        head, *kvs = body.split(";")
        params = {k.strip().lower(): v.strip()
                  for k, v in (kv.split("=", 1) for kv in kvs if "=" in kv)}
        server = head.replace(":", ",")  # host:port -> host,port for ODBC
        parts = [f"DRIVER={{{driver}}}", f"SERVER={server}",
                 f"DATABASE={params.get('database', '')}"]
        if params.get("user"):
            parts += [f"UID={params['user']}", f"PWD={params.get('password', '')}"]
        if params.get("integratedsecurity", "").lower() == "true" or not params.get("user"):
            parts.append("Trusted_Connection=yes")
        parts.append("Encrypt=yes" if params.get("encrypt", "").lower() == "true" else "Encrypt=no")
        parts.append("TrustServerCertificate=yes"
                     if params.get("trustservercertificate", "").lower() == "true"
                     else "TrustServerCertificate=no")
        return ";".join(parts) + ";"

    # Fall back to discrete env vars (local dev default matches the old tools).
    server = os.environ.get("STEVENS_DB_SERVER", r"MICKLAPTOP\TEW_SQLEXPRESS")
    database = os.environ.get("STEVENS_DB_NAME", "stevens_stats")
    user = os.environ.get("STEVENS_DB_USER", "")
    parts = [f"DRIVER={{{driver}}}", f"SERVER={server}", f"DATABASE={database}"]
    if user:
        parts += [f"UID={user}", f"PWD={os.environ.get('STEVENS_DB_PASSWORD', '')}",
                  "Encrypt=yes", "TrustServerCertificate=yes"]
    else:
        parts.append("Trusted_Connection=yes")
    return ";".join(parts) + ";"


def push_to_sqlserver(athletes, events, performances) -> None:
    try:
        import pyodbc
    except ModuleNotFoundError:
        sys.exit("--push needs pyodbc:  pip install pyodbc")

    conn = pyodbc.connect(_sqlserver_conn_str(), autocommit=False)
    cur = conn.cursor()
    cur.fast_executemany = True
    print("  connected")

    # Events (static reference data) --------------------------------------------
    cur.executemany(
        """MERGE Events AS t
           USING (SELECT ? AS event_id, ? AS event_name, ? AS event_season) AS s
           ON t.event_id = s.event_id
           WHEN MATCHED THEN UPDATE SET event_name = s.event_name, event_season = s.event_season
           WHEN NOT MATCHED THEN INSERT (event_id, event_name, event_season)
                VALUES (s.event_id, s.event_name, s.event_season);""",
        [(e, n, s) for e, n, s in events],
    )
    print(f"  events merged ({len(events)})")

    # Athletes (leave nickname/bio/image_path/graduation_year alone) -----------
    cur.executemany(
        """MERGE Athletes AS t
           USING (SELECT ? AS athlete_id, ? AS first_name, ? AS last_name,
                         ? AS year, ? AS sex) AS s
           ON t.athlete_id = s.athlete_id
           WHEN MATCHED THEN UPDATE SET first_name = s.first_name,
                                        last_name  = s.last_name,
                                        year       = s.year,
                                        sex        = s.sex,
                                        active     = 1
           WHEN NOT MATCHED THEN INSERT (athlete_id, first_name, last_name, year, sex, active)
                VALUES (s.athlete_id, s.first_name, s.last_name, s.year, s.sex, 1);""",
        [(a["athlete_id"], a["first_name"], a["last_name"], a["year"], a["sex"]) for a in athletes],
    )
    roster_ids = [a["athlete_id"] for a in athletes]
    if roster_ids:
        placeholders = ",".join("?" * len(roster_ids))
        cur.execute(
            f"UPDATE Athletes SET active = 0 WHERE athlete_id NOT IN ({placeholders})",
            roster_ids,
        )
    print(f"  athletes merged ({len(athletes)}); off-roster athletes marked inactive")

    # Performances: MERGE on the natural key, refreshing flags ----------------
    cur.executemany(
        """MERGE Performances AS t
           USING (SELECT ? AS athlete_id, ? AS event_id, ? AS mark, ? AS season,
                         ? AS date, ? AS result_link, ? AS ranking,
                         ? AS is_personal_best, ? AS is_collegiate_best,
                         ? AS is_overall_best, ? AS is_season_best) AS s
           ON  t.athlete_id = s.athlete_id AND t.event_id = s.event_id
           AND t.mark = s.mark AND t.season = s.season AND t.date = s.date
           WHEN MATCHED THEN UPDATE SET
               result_link        = s.result_link,
               is_personal_best   = s.is_personal_best,
               is_collegiate_best = s.is_collegiate_best,
               is_overall_best    = s.is_overall_best,
               is_season_best     = s.is_season_best
           WHEN NOT MATCHED THEN INSERT
               (athlete_id, event_id, mark, season, date, result_link, ranking,
                is_personal_best, is_collegiate_best, is_overall_best, is_season_best)
               VALUES (s.athlete_id, s.event_id, s.mark, s.season, s.date, s.result_link,
                       s.ranking, s.is_personal_best, s.is_collegiate_best,
                       s.is_overall_best, s.is_season_best);""",
        [(p["athlete_id"], p["event_id"], p["mark"], p["season"], p["date"],
          p["result_link"], p["ranking"],
          int(p["is_personal_best"]), int(p["is_collegiate_best"]),
          int(p["is_overall_best"]), int(p["is_season_best"])) for p in performances],
    )
    print(f"  performances merged ({len(performances)})")

    conn.commit()
    conn.close()
    print("  committed")


# ---------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", type=pathlib.Path, default=DATA_DIR)
    ap.add_argument("--since", default=None,
                    help="season-best cutoff date YYYY-MM-DD (default: Sep 1 of the current academic year)")
    ap.add_argument("--push", action="store_true", help="also write to the SQL Server database")
    args = ap.parse_args(argv)

    season_start = args.since or default_season_start()
    print(f"season-best cutoff: {season_start}")

    athletes = load_athletes(args.data_dir / "roster_raw.csv")
    known = {a["athlete_id"] for a in athletes}
    performances = load_performances(args.data_dir / "performances_raw.csv", known)
    n_groups = flag_bests(performances, season_start)
    events = tfrrs.EVENT_ROWS

    print(f"athletes={len(athletes)}  events={len(events)}  "
          f"performances={len(performances)}  athlete-event groups={n_groups}")

    write_csvs(args.data_dir, athletes, events, performances)

    if args.push:
        print("pushing to SQL Server ...")
        push_to_sqlserver(athletes, events, performances)

    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
