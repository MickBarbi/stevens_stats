"""Re-resolve every name in data/top10.json against the current athletes.json.

    python scraper/top10_relink.py            # rewrite data/top10.json in place
    python scraper/top10_relink.py --dry-run  # just report

top10_from_xlsx.py links names to athlete ids when it builds the board from the
workbook. After the roster grows (alumni backfill), names that had no profile
then can be linked now -- but you may not have the xlsx handy. This re-runs only
the name->id step, using the stored `name` on each entry, so no workbook needed.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

from namematch import Matcher

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOP10 = ROOT / "data" / "top10.json"

# preferred-name / spelling fixes the generic matcher can't reach. Duplicate
# TFRRS profiles are handled upstream now (scraper/athlete_aliases.csv), so this
# is just for genuine name mismatches.
OVERRIDES = {
    "sarahlovelsmith": 8979795,  # rosters as "Sarah", athletes.json as "Lillian"
}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    athletes = json.loads((ROOT / "data" / "athletes.json").read_text("utf-8"))
    perf_path = ROOT / "data" / "performances.json"
    has_marks = (
        {p["athlete_id"] for p in json.loads(perf_path.read_text("utf-8"))}
        if perf_path.exists()
        else set()
    )
    m = Matcher(athletes, has_marks=has_marks, overrides=OVERRIDES)

    lists = json.loads(TOP10.read_text("utf-8"))
    before = after = total = 0
    still: list[str] = []
    for lst in lists:
        for e in lst.get("entries", []):
            targets = e["members"] if lst.get("relay") else [e]
            for t in targets:
                if "name" not in t:
                    continue
                total += 1
                if t.get("athlete_id") is not None:
                    before += 1
                aid = m.id_for(t["name"])
                t["athlete_id"] = aid
                if aid is not None:
                    after += 1
                else:
                    still.append(t["name"])

    print(f"names: {total}  linked: {before} -> {after}  (+{after - before})")
    if still:
        uniq = sorted(set(still))
        print(f"\n{len(uniq)} distinct name(s) still unlinked:")
        for n in uniq:
            print(f"  {n}")

    if args.dry_run:
        print("\n(dry run -- top10.json not written)")
        return 0
    TOP10.write_text(json.dumps(lists, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"\nwrote {TOP10}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
