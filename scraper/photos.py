"""Pull Stevens roster headshots, match them to TFRRS ids, download them.

    python photos.py                # scrape the pages in photo_rosters.txt
    python photos.py --pages FILE   # use a different page list
    python photos.py --dry-run      # match + report, download nothing
    python photos.py --limit N      # stop after N downloads (debugging)

Output:
    data/photos/<athlete_id>.<ext>   one image per matched athlete
    data/photos_manifest.csv         athlete_id,name,source,page,image_url

Then `python photos_upload.py` pushes data/photos/* to Cloudinary, using the
TFRRS id as the public_id (overwriting whatever photo is there now).

Matching: each roster card's display name -> data/athletes.json athlete_id,
using the same first-name alias / accent-folding rules as top10_from_xlsx.py.
The first page an athlete shows up on wins, so photo_rosters.txt lists the
freshest rosters first. Unmatched roster names and athletes left without a
photo are both printed at the end.
"""

from __future__ import annotations

import argparse
import csv
import json
import pathlib
import re
import sys
import time
import unicodedata

import requests
from bs4 import BeautifulSoup

HERE = pathlib.Path(__file__).resolve().parent
DATA_DIR = HERE / "data"
ROOT = HERE.parent
ATHLETES_JSON = ROOT / "data" / "athletes.json"
PERFORMANCES_JSON = ROOT / "data" / "performances.json"
DEFAULT_PAGES = HERE / "photo_rosters.txt"
ORIGIN = "https://stevensducks.com"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) StevensStats photo scraper"
REQUEST_DELAY = 0.4
SKIP_IMAGE = re.compile(r"missing|generic|no[-_]?image|responsive/|/logos?/", re.I)
NAME_SUFFIX = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}

# first-name nicknames -> canonical (lifted from top10_from_xlsx.py)
ALIAS = {
    "danny": "daniel", "dan": "daniel", "matt": "matthew", "matty": "matthew",
    "chris": "christopher", "nick": "nicholas", "mike": "michael", "mikey": "michael",
    "will": "william", "willie": "william", "tom": "thomas", "tommy": "thomas",
    "joe": "joseph", "joey": "joseph", "jake": "jacob", "ben": "benjamin",
    "sam": "samuel", "alex": "alexander", "izzy": "isabella", "cate": "catherine",
    "kate": "katherine", "liz": "elizabeth", "gabe": "gabriel", "andy": "andrew",
    "tony": "anthony", "charlie": "charles", "greg": "gregory", "steve": "steven",
    "jon": "jonathan", "dave": "david", "nate": "nathan", "zach": "zachary",
    "josh": "joshua", "jimmy": "james", "manny": "emmanuel", "manuel": "emmanuel",
}

# roster display name (folded, no spaces) -> athlete_id, for the handful the
# generic matcher can't reach (a preferred name that shares no prefix/alias).
NAME_OVERRIDES = {
    "sarahlovelsmith": 8979795,  # rosters as "Sarah", athletes.json as "Lillian"
}


def fold(s: str) -> str:
    """lowercase, strip accents and non-letters -> matchable token."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


# --- name -> athlete id ------------------------------------------------------
ATHLETES = json.loads(ATHLETES_JSON.read_text("utf-8"))
BY_LAST: dict[str, list[dict]] = {}
for _a in ATHLETES:
    BY_LAST.setdefault(fold(_a["last_name"]), []).append(_a)

# TFRRS sometimes has the same person under two athlete ids; when a roster name
# matches both, prefer the profile that actually has results.
HAS_MARKS: set[int] = set()
if PERFORMANCES_JSON.exists():
    HAS_MARKS = {p["athlete_id"] for p in json.loads(PERFORMANCES_JSON.read_text("utf-8"))}


def first_ok(fl: str, af: str, nick: str | None) -> bool:
    if not fl or not af:
        return False
    if fl == af or af.startswith(fl) or fl.startswith(af):
        return True
    if nick and fl == fold(nick):
        return True
    if ALIAS.get(fl) == af or ALIAS.get(af) == fl:
        return True
    return len(fl) >= 3 and len(af) >= 3 and fl[:3] == af[:3]


def match_id(name: str) -> int | None:
    """Roster display name -> unique athlete_id, or None if 0 / ambiguous."""
    toks = [t for t in name.strip().split() if t.strip(".").lower() not in NAME_SUFFIX]
    if len(toks) < 2:
        return None
    override = NAME_OVERRIDES.get(fold("".join(toks)))
    if override is not None:
        return override
    hits: set[int] = set()
    # try every first|last split ("Bruno Santana Ferro" -> Bruno / Santana Ferro, ...)
    for p in range(1, len(toks)):
        fl = fold(toks[0]) if p == 1 else fold("".join(toks[:p]))
        last = fold("".join(toks[p:]))
        for a in BY_LAST.get(last, []):
            if first_ok(fold(toks[0]), fold(a["first_name"]), a.get("nickname")) or first_ok(
                fl, fold(a["first_name"]), a.get("nickname")
            ):
                hits.add(a["athlete_id"])
    if len(hits) == 1:
        return next(iter(hits))
    # duplicate TFRRS profiles for one person: keep the one with results
    with_marks = hits & HAS_MARKS
    return next(iter(with_marks)) if len(with_marks) == 1 else None


# --- roster scraping -------------------------------------------------------
def read_pages(path: pathlib.Path) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for raw in path.read_text("utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split(None, 1)
        if len(parts) != 2:
            print(f"    skipping malformed line: {raw!r}", file=sys.stderr)
            continue
        out.append((parts[0].lower(), parts[1].strip()))
    return out


def scrape_page(session: requests.Session, url: str) -> list[tuple[str, str]]:
    """-> [(display_name, absolute_full_res_image_url), ...] for cards with a photo."""
    r = session.get(url, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.content, "html.parser")
    found: list[tuple[str, str]] = []
    for li in soup.select("li.sidearm-roster-player"):
        name_el = li.select_one(".sidearm-roster-player-name a") or li.select_one(
            ".sidearm-roster-player-name"
        )
        img = li.select_one(".sidearm-roster-player-image img")
        if not name_el or not img:
            continue
        name = " ".join(name_el.get_text(" ", strip=True).split())
        src = (img.get("data-src") or img.get("src") or "").strip()
        if not src or "/images/" not in src or SKIP_IMAGE.search(src):
            continue
        src = src.split("?", 1)[0]
        if not src.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue
        found.append((name, src if src.startswith("http") else ORIGIN + src))
    return found


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--pages", type=pathlib.Path, default=DEFAULT_PAGES)
    ap.add_argument("--out", type=pathlib.Path, default=DATA_DIR / "photos")
    ap.add_argument("--dry-run", action="store_true", help="match + report, download nothing")
    ap.add_argument("--limit", type=int, default=0, help="stop after N downloads (debug)")
    args = ap.parse_args(argv)

    if not args.pages.exists():
        sys.exit(f"page list not found: {args.pages}")

    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})

    by_name = {a["athlete_id"]: f"{a['first_name']} {a['last_name']}" for a in ATHLETES}
    # athlete_id -> (roster_name, source, page_url, image_url); first hit wins
    chosen: dict[int, tuple[str, str, str, str]] = {}
    unmatched: list[tuple[str, str]] = []  # (name, page_url)

    for source, url in read_pages(args.pages):
        try:
            cards = scrape_page(session, url)
        except requests.RequestException as exc:
            print(f"[{source}] {url}\n    ! {exc.__class__.__name__}: {exc}", file=sys.stderr)
            continue
        matched = 0
        for name, img_url in cards:
            aid = match_id(name)
            if aid is None:
                unmatched.append((name, url))
                continue
            matched += 1
            chosen.setdefault(aid, (name, source, url, img_url))
        print(f"[{source}] {url}\n    {len(cards)} photos, {matched} matched")
        time.sleep(REQUEST_DELAY)

    print(f"\n{len(chosen)} of {len(ATHLETES)} athletes have a photo to pull.")

    # coverage report
    missing = sorted(
        (by_name[a["athlete_id"]] for a in ATHLETES if a["athlete_id"] not in chosen),
        key=str.lower,
    )
    if missing:
        print(f"\n--- {len(missing)} athlete(s) with NO roster photo ---")
        for n in missing:
            print(f"  {n}")
    seen = set()
    dupe_unmatched = [x for x in unmatched if not (x[0] in seen or seen.add(x[0]))]
    if dupe_unmatched:
        print(f"\n--- {len(dupe_unmatched)} roster name(s) that matched NO athlete ---")
        for n, page in dupe_unmatched:
            print(f"  {n:32}  {page.rsplit('/sports/', 1)[-1]}")

    if args.dry_run:
        print("\n(dry run — nothing downloaded)")
        return 0

    # download
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = DATA_DIR / "photos_manifest.csv"
    n_ok = n_fail = 0
    with manifest.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["athlete_id", "name", "source", "page", "image_url"])
        for aid, (name, source, page, img_url) in sorted(chosen.items()):
            ext = pathlib.Path(img_url).suffix.lower() or ".jpg"
            dest = args.out / f"{aid}{ext}"
            try:
                r = session.get(img_url, timeout=30)
                r.raise_for_status()
                dest.write_bytes(r.content)
            except requests.RequestException as exc:
                print(f"  ! {name} ({aid}): {exc.__class__.__name__}", file=sys.stderr)
                n_fail += 1
                continue
            # a previous run may have left the same id under a different extension
            for old in args.out.glob(f"{aid}.*"):
                if old != dest:
                    old.unlink()
            w.writerow([aid, name, source, page, img_url])
            n_ok += 1
            if args.limit and n_ok >= args.limit:
                print(f"  (stopped at --limit {args.limit})")
                break
            time.sleep(REQUEST_DELAY)

    print(f"\nDownloaded {n_ok} photo(s) -> {args.out}" + (f", {n_fail} failed" if n_fail else ""))
    print(f"Manifest: {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
