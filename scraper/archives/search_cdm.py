#!/usr/bin/env python3
"""
Search the Stevens archives (stevensarchives.contentdm.oclc.org) by keyword
instead of clicking through the site's viewer.

The site is a CONTENTdm instance. It doesn't advertise an API, but it exposes
two of them under the hood:
  - a modern REST search API at /digital/api/search/...
  - the legacy CONTENTdm dmwebservices API at /digital/bl/dmwebservices/...
    (note: /digital/bl/, not the bare /dmwebservices/ path some docs show —
    that one 404s on this server)

Newspaper pages in this collection were OCR'd at ingestion, so every page has
a "full" field with its raw scanned text, and that's what /digital/api/search
matches against. This script searches, then pulls each hit's page-level OCR
text and greps it locally to show exactly which page(s) matched and a snippet
of the surrounding text — no manual PDF export or screenshotting needed.

Collections (aliases), from dmGetCollectionList:
  p4100coll1    Frederick Winslow Taylor Collection
  StevensYB01   The Stevens Yearbook Collection (1874-2000)
  StevensNP02   The Stevens Indicator Collection (1884-2000) -- alumni magazine
  StevensNP01   The Stute Newspaper Collection (1904-2000)   -- student paper
  p16277coll5   Academic Departments Collection
  p16277coll9   Special Programs Collection
  p16277coll1   Stevens History Publications
  p16277coll4   The Stevens Life (1890-1899)
  p16277coll7   Stevens Athletics Collection -- photos, not OCR'd (no "full" text)
  p16277coll6   Stevens Buildings & Grounds Collection
  p16277coll10  Theodore Boettger Collection
  p16277coll2   The Goodyear Aeronautical Department Collection

Note: the two collections most likely to mention coaches/athletes (Stute,
Indicator) are both catalogued as ending in 2000 — same cutoff as the existing
scraper/archives/batches/ decks. This tool searches the same underlying
material faster; it doesn't have anything past 2000 to offer for the
post-2000 coaching timeline.

Usage:
    python search_cdm.py "al alonso" --start-date 1980 --end-date 1985
    python search_cdm.py "cross country coach" --collections StevensNP01
    python search_cdm.py gingrich --max-issues 10 --no-fulltext

By default searches the Stute + Indicator collections (the two with OCR'd
text) and prints, per matching issue, the date, a direct link, and a snippet
around each page-level match. Pass --no-fulltext to just list matching
issues fast, without fetching page text (useful for a first broad pass before
narrowing the term/date range).
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HOST = "https://stevensarchives.contentdm.oclc.org"
DEFAULT_COLLECTIONS = ["StevensNP01", "StevensNP02"]  # Stute, Indicator — OCR'd
UA = "Mozilla/5.0 (compatible; stevens-stats-archive-search/1.0)"


def _get_json(url: str, retries: int = 2):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
    raise last_err


def search(term: str, collections: list[str], max_issues: int, page_size: int = 25):
    """Yield search-result issue/item dicts across `collections`, up to max_issues."""
    alias = "!".join(collections)
    term_q = urllib.parse.quote(term)
    fetched = 0
    page = 1
    while fetched < max_issues:
        want = min(page_size, max_issues - fetched)
        url = (
            f"{HOST}/digital/api/search/collection/{alias}/searchterm/{term_q}"
            f"/field/all/mode/all/maxRecords/{want}/page/{page}"
        )
        data = _get_json(url)
        items = data.get("items", [])
        if not items:
            return
        for it in items:
            yield it
        fetched += len(items)
        total = data.get("totalResults", 0)
        if fetched >= total:
            return
        page += 1


def get_item_info(alias: str, item_id: str) -> dict:
    url = f"{HOST}/digital/bl/dmwebservices/index.php?q=dmGetItemInfo/{alias}/{item_id}/json"
    return _get_json(url)


def get_pages(alias: str, item_id: str) -> list[tuple[str, str]]:
    """Return [(pagetitle, pageptr_item_id), ...] for a compound object.
    A non-compound (single-image/page) item just returns itself."""
    url = f"{HOST}/digital/bl/dmwebservices/index.php?q=dmGetCompoundObjectInfo/{alias}/{item_id}/json"
    data = _get_json(url)
    if isinstance(data, dict) and data.get("page"):
        return [(p["pagetitle"], p["pageptr"]) for p in data["page"]]
    return [("(single item)", item_id)]


def snippet(text: str, term: str, context: int = 220) -> list[str]:
    """Return a short excerpt around each case-insensitive match of `term`."""
    out = []
    for m in re.finditer(re.escape(term), text, re.IGNORECASE):
        start = max(0, m.start() - context // 2)
        end = min(len(text), m.end() + context // 2)
        excerpt = text[start:end].replace("\n", " ").strip()
        out.append(("…" if start > 0 else "") + excerpt + ("…" if end < len(text) else ""))
    return out


def date_in_range(date_str: str, start: str | None, end: str | None) -> bool:
    if not date_str:
        return True
    if start and date_str < start:
        return False
    if end and date_str > end:
        return False
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("term", help="keyword or phrase to search for")
    ap.add_argument(
        "--collections",
        default=",".join(DEFAULT_COLLECTIONS),
        help=f"comma-separated collection aliases (default: {','.join(DEFAULT_COLLECTIONS)})",
    )
    ap.add_argument("--start-date", default=None, help="e.g. 1980 or 1980-09-01")
    ap.add_argument("--end-date", default=None, help="e.g. 1985 or 1985-06-30")
    ap.add_argument("--max-issues", type=int, default=25, help="max matching issues to inspect (default 25)")
    ap.add_argument(
        "--no-fulltext",
        action="store_true",
        help="just list matching issues (fast); skip fetching/snippeting page text",
    )
    ap.add_argument(
        "--max-pages-per-item",
        type=int,
        default=60,
        help="cap page-text fetches per compound object (default 60) — a whole yearbook "
        "can be 300+ pages and there's no page-level search API, so pinpointing a term "
        "means fetching pages one at a time; this bounds how much a single hit costs",
    )
    args = ap.parse_args()

    collections = [c.strip() for c in args.collections.split(",") if c.strip()]
    print(f"Searching {', '.join(collections)} for {args.term!r} ...\n", file=sys.stderr)

    hits = 0
    for item in search(args.term, collections, args.max_issues):
        fields = {f["field"]: f["value"] for f in item.get("metadataFields", [])}
        date = fields.get("date", "")
        if not date_in_range(date, args.start_date, args.end_date):
            continue
        hits += 1
        title = item.get("title", "?")
        alias = item["collectionAlias"]
        item_id = item["itemId"]
        link = f"{HOST}{item.get('itemLink', '')}"
        print(f"=== {title}  ({date})  {alias}/{item_id} ===")
        print(f"    {link}")

        if args.no_fulltext:
            print()
            continue

        pages = get_pages(alias, item_id)
        truncated = len(pages) > args.max_pages_per_item
        pages = pages[: args.max_pages_per_item]
        found_any = False
        for pagetitle, pageptr in pages:
            try:
                info = get_item_info(alias, pageptr)
            except Exception as e:
                print(f"    [{pagetitle}, id {pageptr}] (skipped — request failed: {e})")
                continue
            full = info.get("full")
            if not isinstance(full, str) or not full.strip():
                continue
            excerpts = snippet(full, args.term)
            if excerpts:
                found_any = True
            for ex in excerpts:
                print(f"    [{pagetitle}, id {pageptr}] {ex}")
            time.sleep(0.15)  # be polite to a small institutional server
        if not found_any:
            print(f"    (matched at issue level, but not found on any of the "
                  f"{len(pages)} page(s) checked — likely OCR noise or a metadata-only match)")
        if truncated:
            print(f"    (stopped after {args.max_pages_per_item} pages; this item has more — "
                  f"rerun with a higher --max-pages-per-item to check the rest)")
        print()

    if hits == 0:
        print("No matches in that date range. Try widening --start-date/--end-date, "
              "or drop --no-fulltext off if you used it, since date filtering happens "
              "client-side after fetching each hit's metadata.", file=sys.stderr)


if __name__ == "__main__":
    main()
