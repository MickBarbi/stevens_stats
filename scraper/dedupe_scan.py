"""Find athletes that are probably the same person under two+ TFRRS ids.

    python scraper/dedupe_scan.py                 # print the clusters
    python scraper/dedupe_scan.py --write         # (re)generate athlete_aliases.csv

TFRRS splits a career across ids at re-registration (and did a mass split around
2012), so one person shows up as id-A (2009-2012) + id-B (2012-2013), same
events, back-to-back years. This clusters athletes by name, proposes the id with
the most marks as canonical, and flags clusters whose segments have a multi-year
gap or heavy overlap -- those might be two different people, review by hand.

load.py reads athlete_aliases.csv and folds every alias id into its canonical
(performances remapped before flags/ids, alias gets no athletes.json entry,
manual fields inherited). Re-run this after a roster backfill.
"""

from __future__ import annotations

import argparse
import collections
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from namematch import _first_ok, fold  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALIASES_CSV = pathlib.Path(__file__).resolve().parent / "athlete_aliases.csv"


def _year(d: str) -> int:
    return int(d[:4])


def clusters():
    A = json.loads((ROOT / "data" / "athletes.json").read_text("utf-8"))
    P = json.loads((ROOT / "data" / "performances.json").read_text("utf-8"))
    marks: dict[int, list] = collections.defaultdict(list)
    for p in P:
        marks[p["athlete_id"]].append(p["date"])

    by_last: dict[str, list] = collections.defaultdict(list)
    for a in A:
        by_last[fold(a["last_name"])].append(a)

    def compat(a, b) -> bool:
        fa, fb = fold(a["first_name"]), fold(b["first_name"])
        return _first_ok(fa, fb, b.get("nickname")) or _first_ok(fb, fa, a.get("nickname"))

    out = []
    for group in by_last.values():
        if len(group) < 2:
            continue
        parent = {a["athlete_id"]: a["athlete_id"] for a in group}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                if compat(group[i], group[j]):
                    parent[find(group[i]["athlete_id"])] = find(group[j]["athlete_id"])
        buckets: dict[int, list] = collections.defaultdict(list)
        for a in group:
            buckets[find(a["athlete_id"])].append(a)
        for b in buckets.values():
            if len(b) > 1:
                out.append(sorted(b, key=lambda a: -len(marks[a["athlete_id"]])))
    return out, marks


def review_reason(members, marks) -> str:
    segs = []
    for a in members:
        ds = marks[a["athlete_id"]]
        if ds:
            segs.append((_year(min(ds)), _year(max(ds))))
    segs.sort()
    for (s1, e1), (s2, e2) in zip(segs, segs[1:]):
        if s2 - e1 >= 2:
            return f"{s2 - e1}yr gap between {e1} and {s2}"
        if min(e1, e2) - max(s1, s2) >= 3:
            return f"segments overlap {max(s1, s2)}-{min(e1, e2)}"
    return ""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true", help=f"write {ALIASES_CSV.name}")
    args = ap.parse_args(argv)

    cs, marks = clusters()
    cs.sort(key=lambda c: (review_reason(c, marks) == "", -len(c), c[0]["last_name"]))

    lines = [
        "# alias_id,canonical_id,note",
        "# Same person, two+ TFRRS ids. load.py folds each alias into its canonical.",
        "# Regenerate with: python scraper/dedupe_scan.py --write",
        "# Rows under a `# REVIEW` heading are commented out -- check them, then",
        "# uncomment the ones that really are one person.",
        "",
    ]
    n_review = 0
    for c in cs:
        canon = c[0]["athlete_id"]
        reason = review_reason(c, marks)
        head = f"# {c[0]['first_name']} {c[0]['last_name']}"
        if reason:
            n_review += 1
            lines.append(f"{head}  -- REVIEW: {reason}")
            for a in c[1:]:
                lines.append(f"# {a['athlete_id']},{canon},{c[0]['first_name']} {c[0]['last_name']} (REVIEW)")
        else:
            lines.append(head)
            for a in c[1:]:
                lines.append(f"{a['athlete_id']},{canon},{c[0]['first_name']} {c[0]['last_name']}")
        lines.append("")

        # console view
        print(f"--- {c[0]['first_name']} {c[0]['last_name']}" + (f"   [REVIEW: {reason}]" if reason else ""))
        for a in c:
            ds = marks[a["athlete_id"]]
            span = f"{min(ds)[:4]}-{max(ds)[:4]}" if ds else "no marks"
            man = [k for k in ("nickname", "bio", "graduation_year", "status", "image_path") if a.get(k)]
            role = "canonical" if a["athlete_id"] == canon else "alias    "
            print(
                f"    {role} id={a['athlete_id']:>9}  {a['first_name']} {a['last_name']:<20}"
                f" marks={len(ds):>3}  {span:11}" + (f"  manual:{','.join(man)}" if man else "")
            )
        print()

    print(f"{len(cs)} clusters  ({len(cs) - n_review} auto, {n_review} to review)")
    if args.write:
        ALIASES_CSV.write_text("\n".join(lines).rstrip() + "\n", "utf-8")
        print(f"wrote {ALIASES_CSV}")
    else:
        print(f"(run with --write to (re)generate {ALIASES_CSV.name})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
