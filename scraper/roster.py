"""Scrape the current Stevens men's and women's rosters from TFRRS.

    python roster.py                 # -> data/roster_raw.csv
    python roster.py --out foo.csv

Output columns: athlete_id, first_name, last_name, class_year, sex
This replaces the old get_ids_and_names.py and picks up new athletes on its own.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import sys

import tfrrs

DATA_DIR = pathlib.Path(__file__).resolve().parent / "data"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=pathlib.Path, default=DATA_DIR / "roster_raw.csv")
    args = ap.parse_args(argv)

    rows: list[tfrrs.RosterEntry] = []
    for sex, url in tfrrs.TEAM_PAGES.items():
        print(f"[{sex}] {url}")
        soup = tfrrs.fetch(url)
        if soup is None:
            print(f"    FAILED to fetch {sex} team page", file=sys.stderr)
            continue
        entries = tfrrs.parse_roster(soup, sex)
        print(f"    {len(entries)} athletes")
        rows.extend(entries)

    if not rows:
        print("No athletes scraped; leaving any existing file untouched.", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    rows.sort(key=lambda r: (r.last_name.lower(), r.first_name.lower()))
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["athlete_id", "first_name", "last_name", "class_year", "sex"])
        for e in rows:
            writer.writerow([e.athlete_id, e.first_name, e.last_name, e.class_year or "", e.sex])

    print(f"Wrote {len(rows)} athletes -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
