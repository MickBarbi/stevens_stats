"""Scrape every rostered athlete's full career progression from TFRRS.

    python history.py                       # ids from data/roster_raw.csv
    python history.py --ids 8327859 7892451 # just these athletes
    python history.py --limit 5             # first 5 (smoke test)
    python history.py --resume              # skip ids already in the out file

Output columns: athlete_id, event_id, mark, season, date, result_link
This replaces the old history.py (which only handled 300/500/55m) and its
never-finished sibling; it walks every event in <div id="event-history">.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import sys

import tfrrs

DATA_DIR = pathlib.Path(__file__).resolve().parent / "data"


def _read_roster_ids(path: pathlib.Path) -> list[int]:
    if not path.exists():
        sys.exit(f"roster file not found: {path}  (run roster.py first, or pass --ids)")
    with path.open(encoding="utf-8") as fh:
        return [int(row["athlete_id"]) for row in csv.DictReader(fh) if row.get("athlete_id")]


def _existing_ids(path: pathlib.Path) -> set[int]:
    if not path.exists():
        return set()
    with path.open(encoding="utf-8") as fh:
        return {int(r["athlete_id"]) for r in csv.DictReader(fh) if r.get("athlete_id")}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--roster", type=pathlib.Path, default=DATA_DIR / "roster_raw.csv")
    ap.add_argument("--out", type=pathlib.Path, default=DATA_DIR / "performances_raw.csv")
    ap.add_argument("--ids", nargs="*", type=int, help="explicit athlete ids (skips the roster file)")
    ap.add_argument("--limit", type=int, help="only the first N ids")
    ap.add_argument("--resume", action="store_true", help="append, skipping ids already in --out")
    args = ap.parse_args(argv)

    ids = args.ids or _read_roster_ids(args.roster)
    already = _existing_ids(args.out) if args.resume else set()
    if already:
        ids = [i for i in ids if i not in already]
        print(f"resume: {len(already)} ids already done, {len(ids)} to go")
    if args.limit:
        ids = ids[: args.limit]
    if not ids:
        print("Nothing to scrape.", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    mode = "a" if (args.resume and args.out.exists()) else "w"
    total = 0
    with args.out.open(mode, newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        if mode == "w":
            writer.writerow(["athlete_id", "event_id", "mark", "season", "date", "result_link"])
        for n, athlete_id in enumerate(ids, 1):
            url = f"{tfrrs.TFRRS_BASE}/athletes/{athlete_id}"
            print(f"({n}/{len(ids)}) {url}")
            soup = tfrrs.fetch(url)
            if soup is None:
                print(f"    FAILED {athlete_id}", file=sys.stderr)
                continue
            perfs = tfrrs.parse_history(soup, athlete_id)
            for p in perfs:
                writer.writerow([p.athlete_id, p.event_id, p.mark, p.season, p.date, p.result_link or ""])
            fh.flush()
            total += len(perfs)
            print(f"    {len(perfs)} performances")

    print(f"Wrote {total} performances -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
