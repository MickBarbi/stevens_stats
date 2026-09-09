"""Scrape athletes' full career progression from TFRRS, incrementally.

`performances_raw.csv` is a persistent cache: each run re-scrapes only the
athletes that might have new results and splices them back into the file.

    python history.py                 # only athletes with active=1 in roster_raw.csv
    python history.py --all           # every athlete in roster_raw.csv (full sweep)
    python history.py --missing       # + anyone with no cached rows yet (backfill)
    python history.py --stale 90      # + anyone not scraped in the last 90 days
    python history.py --ids 8327859 7892451   # exactly these, ignore the roster
    python history.py --limit 5       # first 5 of the selection (smoke test)
    python history.py --resume        # skip ids already scraped today (resume a run)

Default is active-only because graduated athletes don't compete any more, so
re-fetching a few hundred alumni every week is wasted work. Run `--all` after a
season ends (or `--stale`), and `--missing` while backfilling old rosters.

Output columns: athlete_id, event_id, mark, season, date, result_link
Also writes data/scrape_state.json  {athlete_id: {last_scraped, n}}.

`load.py` turns the CSV into the site JSON and recomputes every best-flag from
the full list, so a stale cache never produces a stale record.
"""

from __future__ import annotations

import argparse
import csv
import json
import pathlib
import sys
from collections import defaultdict
from datetime import date, timedelta

import tfrrs

DATA_DIR = pathlib.Path(__file__).resolve().parent / "data"
COLUMNS = ["athlete_id", "event_id", "mark", "season", "date", "result_link"]
FLUSH_EVERY = 25


def _read_roster(path: pathlib.Path) -> list[tuple[int, bool]]:
    if not path.exists():
        sys.exit(f"roster file not found: {path}  (run roster.py first, or pass --ids)")
    out: list[tuple[int, bool]] = []
    with path.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if not r.get("athlete_id"):
                continue
            active = str(r.get("active", "1")).strip().lower() not in ("0", "false", "no", "")
            out.append((int(r["athlete_id"]), active))
    return out


def _load_cache(path: pathlib.Path) -> dict[int, list[dict]]:
    cache: dict[int, list[dict]] = defaultdict(list)
    if not path.exists():
        return cache
    with path.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if not r.get("athlete_id"):
                continue
            cache[int(r["athlete_id"])].append({k: (r.get(k) or "") for k in COLUMNS})
    return cache


def _write_cache(path: pathlib.Path, cache: dict[int, list[dict]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for aid in sorted(cache):
            rows = sorted(
                cache[aid],
                key=lambda x: (int(x["event_id"] or 0), x["date"], str(x["mark"])),
            )
            w.writerows(rows)
    tmp.replace(path)


def _load_state(path: pathlib.Path) -> dict[int, dict]:
    if not path.exists():
        return {}
    try:
        return {int(k): v for k, v in json.loads(path.read_text("utf-8")).items()}
    except (json.JSONDecodeError, ValueError):
        return {}


def _save_state(path: pathlib.Path, state: dict[int, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(
        json.dumps({str(k): state[k] for k in sorted(state)}, indent=1), encoding="utf-8"
    )
    tmp.replace(path)


def _select(args, roster: list[tuple[int, bool]], cache, state) -> list[int]:
    if args.ids:
        return list(dict.fromkeys(args.ids))

    ids = [aid for aid, active in roster] if args.all else [aid for aid, active in roster if active]
    extra: set[int] = set()
    if args.missing:
        extra |= {aid for aid, _ in roster if not cache.get(aid)}
    if args.stale is not None:
        cutoff = date.today() - timedelta(days=args.stale)
        for aid, _ in roster:
            seen = state.get(aid, {}).get("last_scraped")
            if not seen or date.fromisoformat(seen) < cutoff:
                extra.add(aid)
    return list(dict.fromkeys([*ids, *sorted(extra)]))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--roster", type=pathlib.Path, default=DATA_DIR / "roster_raw.csv")
    ap.add_argument("--out", type=pathlib.Path, default=DATA_DIR / "performances_raw.csv")
    ap.add_argument("--state", type=pathlib.Path, default=DATA_DIR / "scrape_state.json")
    ap.add_argument("--ids", nargs="*", type=int, help="explicit athlete ids (skips the roster)")
    ap.add_argument("--all", action="store_true", help="every athlete in roster_raw.csv")
    ap.add_argument("--missing", action="store_true", help="also anyone with no cached rows")
    ap.add_argument("--stale", type=int, metavar="DAYS",
                    help="also anyone not scraped in the last DAYS days")
    ap.add_argument("--limit", type=int, help="only the first N of the selection")
    ap.add_argument("--resume", action="store_true", help="skip ids already scraped today")
    ap.add_argument("--flush-every", type=int, default=FLUSH_EVERY,
                    help=f"write the cache every N athletes (default {FLUSH_EVERY})")
    args = ap.parse_args(argv)

    roster = [] if args.ids else _read_roster(args.roster)
    cache = _load_cache(args.out)
    state = _load_state(args.state)

    if not cache and not (args.all or args.missing or args.ids):
        print(
            "  note: no existing performances_raw.csv — this run scrapes the ACTIVE roster "
            "only. Run `history.py --all` once to build the full cache.",
            file=sys.stderr,
        )

    targets = _select(args, roster, cache, state)
    if args.resume:
        today = date.today().isoformat()
        before = len(targets)
        targets = [i for i in targets if state.get(i, {}).get("last_scraped") != today]
        if before != len(targets):
            print(f"resume: {before - len(targets)} already done today, {len(targets)} to go")
    if args.limit:
        targets = targets[: args.limit]

    if not targets:
        print("Nothing to scrape — selection is empty or already fresh.")
        return 0

    kind = "explicit ids" if args.ids else ("full roster" if args.all else "active roster")
    print(f"scraping {len(targets)} athlete(s) [{kind}]; {len(cache)} already cached\n")

    done: list[int] = []
    failed: list[int] = []
    for n, athlete_id in enumerate(targets, 1):
        url = f"{tfrrs.TFRRS_BASE}/athletes/{athlete_id}"
        print(f"({n}/{len(targets)}) {url}")
        soup = tfrrs.fetch(url)
        if soup is None:
            print(f"    FAILED — keeping {len(cache.get(athlete_id, []))} cached row(s)",
                  file=sys.stderr)
            failed.append(athlete_id)
            continue
        perfs = tfrrs.parse_history(soup, athlete_id)
        cache[athlete_id] = [
            {
                "athlete_id": p.athlete_id,
                "event_id": p.event_id,
                "mark": str(p.mark),
                "season": p.season,
                "date": p.date,
                "result_link": p.result_link or "",
            }
            for p in perfs
        ]
        state[athlete_id] = {"last_scraped": date.today().isoformat(), "n": len(perfs)}
        done.append(athlete_id)
        print(f"    {len(perfs)} performances")
        if args.flush_every and len(done) % args.flush_every == 0:
            _write_cache(args.out, cache)
            _save_state(args.state, state)
            print(f"    … flushed ({len(done)} scraped)")

    _write_cache(args.out, cache)
    _save_state(args.state, state)

    total = sum(len(v) for v in cache.values())
    print(
        f"\n{len(done)} scraped, {len(failed)} failed — "
        f"{len(cache)} athletes / {total} performances cached -> {args.out}"
    )
    if failed:
        print("failed ids:", " ".join(map(str, failed)), file=sys.stderr)
    return 1 if failed and not done else 0


if __name__ == "__main__":
    raise SystemExit(main())
