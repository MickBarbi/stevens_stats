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

The extra-URLs file (default: scraper/rosters.txt) is one roster page per line.
Just paste the URL -- men/women is read from the `_m_` / `_f_` in it:

    https://www.tfrrs.org/teams/tf/NJ_college_m_Stevens.html?config_hnd=255
    f  https://www.tfrrs.org/.../roster/...     # or force it with an m|f prefix

Blank lines and lines starting with # are ignored. TFRRS's URL pattern for a
given season isn't predictable, so paste each page URL by hand.
"""

from __future__ import annotations

import argparse
import csv
import pathlib
import re
import sys

import tfrrs

_SEX_IN_URL = re.compile(r"_college_([mf])_|_([mf])_Stevens", re.I)
_YEAR_PREFIX = {"FR": 1, "SO": 2, "JR": 3, "SR": 4, "GR": 5, "5T": 5}

HERE = pathlib.Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
DEFAULT_EXTRA = HERE / "rosters.txt"


def _yr(token: str | None) -> int:
    """'SR-4' -> 4, 'FR-1' -> 1, '' / unknown -> 0."""
    if not token:
        return 0
    t = token.strip().upper()
    if "-" in t:
        tail = t.split("-", 1)[1].strip()
        if tail.isdigit():
            return int(tail)
    return _YEAR_PREFIX.get(t[:2], 0)


def _keep_better(pool: dict[int, tfrrs.RosterEntry], e: tfrrs.RosterEntry) -> None:
    """Insert `e`, or replace an existing entry when `e` has a higher class year.

    Across 15+ seasons an athlete appears on many roster pages; we want the
    label from their *senior-most* one, whatever order the URLs are listed in.
    """
    cur = pool.get(e.athlete_id)
    if cur is None or _yr(e.class_year) > _yr(cur.class_year):
        pool[e.athlete_id] = e


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


def _sex_from_url(url: str) -> str | None:
    m = _SEX_IN_URL.search(url)
    return (m.group(1) or m.group(2)).upper() if m else None


def _read_extra(path: pathlib.Path) -> list[tuple[str, str]]:
    """[(sex, url), ...] from the hand-maintained roster-URL file.

    A line is either `<url>` (men/women inferred from `_m_`/`_f_` in it) or
    `m|f <url>` to force it.
    """
    out: list[tuple[str, str]] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split(None, 1)
        if len(parts) == 2 and parts[0].strip().upper() in ("M", "F"):
            out.append((parts[0].strip().upper(), parts[1].strip()))
            continue
        if len(parts) == 1 and parts[0].lower().startswith("http"):
            sex = _sex_from_url(parts[0])
            if sex:
                out.append((sex, parts[0]))
                continue
        print(f"    skipping line (need 'm|f <url>' or a URL with _m_/_f_): {raw!r}",
              file=sys.stderr)
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
                _keep_better(pool, e)
                current_ids.add(e.athlete_id)

    if args.extra_urls.exists():
        for sex, url in _read_extra(args.extra_urls):
            print(f"[archive {sex}] {url}")
            for e in _scrape(url, sex):
                _keep_better(pool, e)  # senior-most class year across all rosters wins
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
        for _aid, e in _read_existing(args.out).items():
            if e.athlete_id not in pool:
                kept += 1
            _keep_better(pool, e)  # also lifts a stale low year back to a known higher one
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
