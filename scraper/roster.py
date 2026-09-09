"""Scrape Stevens rosters from TFRRS -> data/roster_raw.csv.

    python roster.py                      # current men's + women's rosters
    python roster.py --extra-urls FILE    # ALSO scrape the historical roster
                                          # pages listed in FILE (alumni)

Output columns: athlete_id, first_name, last_name, class_year, sex, active

`active` is 1 for anyone on a current team page, 0 otherwise. `history.py` then
scrapes the athletes in roster_raw.csv (by default only the active ones); `load.py`
keeps the inactive rows and flags them active=false, so alumni get an /athlete
page but stay out of the roster / events / feed.

By default this MERGES with the existing roster_raw.csv: every athlete_id ever
written stays in the file, and `active` is recomputed from the current team pages
each run. So once you've scraped a past season's roster URL once, you can delete
it from rosters.txt -- those athletes persist. Pass --no-merge for the old
from-scratch behaviour.

The extra-URLs file (default: scraper/rosters.txt) is one roster page per line:

    m  https://www.tfrrs.org/.../roster/...     # men's indoor 2023
    f  https://www.tfrrs.org/.../roster/...     # women's outdoor 2022

Blank lines and lines starting with # are ignored. TFRRS's URL pattern for a
given season isn't predictable, so paste each page URL by hand.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import sys

import tfrrs

HERE = pathlib.Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
DEFAULT_EXTRA = HERE / "rosters.txt"


def _scrape(url: str, sex: str) -> list[tfrrs.RosterEntry]:
    soup = tfrrs.fetch(url)
    if soup is None:
        print(f"    FAILED to fetch {url}", file=sys.stderr)
        return []
    entries = tfrrs.parse_roster(soup, sex)
    print(f"    {len(entries)} athletes")
    return entries


def _read_existing(path: pathlib.Path) -> dict[int, tfrrs.RosterEntry]:
    """Reconstruct RosterEntry rows from a previously written roster_raw.csv."""
    out: dict[int, tfrrs.RosterEntry] = {}
    if not path.exists():
        return out
    with path.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if not r.get("athlete_id"):
                continue
            aid = int(r["athlete_id"])
            out[aid] = tfrrs.RosterEntry(
                aid,
                (r.get("first_name") or "").strip(),
                (r.get("last_name") or "").strip(),
                (r.get("class_year") or "").strip() or None,
                (r.get("sex") or "").strip().upper(),
            )
    return out


def _read_extra(path: pathlib.Path) -> list[tuple[str, str]]:
    """[(sex, url), ...] from the hand-maintained roster-URL file."""
    out: list[tuple[str, str]] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split(None, 1)
        if len(parts) != 2 or parts[0].strip().upper() not in ("M", "F"):
            print(f"    skipping malformed line (need 'm|f <url>'): {raw!r}", file=sys.stderr)
            continue
        out.append((parts[0].strip().upper(), parts[1].strip()))
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--out", type=pathlib.Path, default=DATA_DIR / "roster_raw.csv")
    ap.add_argument(
        "--extra-urls",
        type=pathlib.Path,
        default=DEFAULT_EXTRA,
        help=f"file of historical roster URLs (default: {DEFAULT_EXTRA.name} if present)",
    )
    ap.add_argument(
        "--no-current",
        action="store_true",
        help="skip the current team pages (only scrape --extra-urls)",
    )
    ap.add_argument(
        "--no-merge",
        action="store_true",
        help="rewrite from scratch instead of merging with the existing roster_raw.csv",
    )
    args = ap.parse_args(argv)

    pool: dict[int, tfrrs.RosterEntry] = {}
    current_ids: set[int] = set()

    if not args.no_current:
        for sex, url in tfrrs.TEAM_PAGES.items():
            print(f"[current {sex}] {url}")
            for e in _scrape(url, sex):
                pool[e.athlete_id] = e
                current_ids.add(e.athlete_id)

    if args.extra_urls.exists():
        for sex, url in _read_extra(args.extra_urls):
            print(f"[archive {sex}] {url}")
            for e in _scrape(url, sex):
                pool.setdefault(e.athlete_id, e)  # a current entry wins (fresher class year)
    elif args.extra_urls != DEFAULT_EXTRA:
        sys.exit(f"--extra-urls file not found: {args.extra_urls}")

    if not current_ids and not args.no_current:
        print(
            "  ! no current-roster athletes scraped (TFRRS down?); "
            "not touching roster_raw.csv so `active` flags stay correct.",
            file=sys.stderr,
        )
        return 1

    n_scraped = len(pool)
    if not args.no_merge:
        kept = 0
        for aid, e in _read_existing(args.out).items():
            if aid not in pool:
                pool[aid] = e
                kept += 1
        if kept:
            print(f"[merge] kept {kept} athlete(s) from the existing {args.out.name}")

    if not pool:
        print("No athletes scraped; leaving any existing file untouched.", file=sys.stderr)
        return 1

    rows = sorted(pool.values(), key=lambda r: (r.last_name.lower(), r.first_name.lower()))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["athlete_id", "first_name", "last_name", "class_year", "sex", "active"])
        for e in rows:
            w.writerow(
                [
                    e.athlete_id,
                    e.first_name,
                    e.last_name,
                    e.class_year or "",
                    e.sex,
                    1 if e.athlete_id in current_ids else 0,
                ]
            )

    n_alum = len(rows) - len(current_ids)
    merged_note = "" if args.no_merge else f", {len(rows) - n_scraped} carried over"
    print(
        f"Wrote {len(rows)} athletes ({len(current_ids)} current, {n_alum} alumni"
        f"{merged_note}) -> {args.out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
