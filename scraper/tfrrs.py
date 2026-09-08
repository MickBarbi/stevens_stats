"""Shared TFRRS scraping helpers for Stevens Stats data collection.

TFRRS has no public API, so everything here is HTML scraping with BeautifulSoup.
The CSS selectors and text clean-up below were reverse-engineered from the live
site (Sept 2026). If TFRRS changes its markup, these three functions are the
only things that should need touching:

    * parse_roster()  - the team page's "NAME / YEAR" table
    * parse_history() - the per-event tables inside <div id="event-history">
    * parse_mark() / parse_meet_date() - cell-text clean-up

Nothing here writes to a database; the CLIs (roster.py, history.py) call these
and emit CSV. load.py turns that CSV into rows the website's schema expects.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation

import requests
from bs4 import BeautifulSoup

TFRRS_BASE = "https://www.tfrrs.org"

# Team result pages.  "_m_" = men, "_f_" = women.  (An old script used "_w_";
# the current site uses "_f_".)
TEAM_PAGES = {
    "M": f"{TFRRS_BASE}/teams/tf/NJ_college_m_Stevens.html",
    "F": f"{TFRRS_BASE}/teams/tf/NJ_college_f_Stevens.html",
}

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)

REQUEST_TIMEOUT = 45          # seconds
REQUEST_DELAY = 1.5           # polite pause between successful requests
MAX_RETRIES = 5

# ---------------------------------------------------------------------------
# Event name -> event_id, matching the website's `Events` table (see
# prisma/schema.prisma and app/athlete/[athleteId]/page.tsx `event_name_key`).
# Keys are the *normalised* name: whitespace collapsed, "(Indoor)"/"(Outdoor)"
# rewritten to the plural form TFRRS's older pages used.
# ---------------------------------------------------------------------------
EVENT_IDS = {
    "60 Meters (Indoors)": 1,
    "100 Meters (Outdoors)": 2,
    "200 Meters (Indoors)": 3,
    "200 Meters (Outdoors)": 3,
    "400 Meters (Indoors)": 4,
    "400 Meters (Outdoors)": 4,
    "600 Meters (Indoors)": 5,
    "800 Meters (Indoors)": 6,
    "800 Meters (Outdoors)": 6,
    "1000 Meters (Indoors)": 7,
    "1500 Meters (Outdoors)": 8,
    "Mile (Indoors)": 9,
    "3000 Meters (Indoors)": 10,
    "3000 Meters (Outdoors)": 10,
    "5000 Meters (Indoors)": 11,
    "5000 Meters (Outdoors)": 11,
    "10,000 Meters (Outdoors)": 12,
    "60 Hurdles (Indoors)": 13,
    "100 Hurdles (Outdoors)": 14,
    "110 Hurdles (Outdoors)": 15,
    "400 Hurdles (Outdoors)": 16,
    "3000 Steeplechase (Outdoors)": 17,
    "High Jump (Indoors)": 18,
    "High Jump (Outdoors)": 18,
    "Pole Vault (Indoors)": 19,
    "Pole Vault (Outdoors)": 19,
    "Long Jump (Indoors)": 20,
    "Long Jump (Outdoors)": 20,
    "Triple Jump (Indoors)": 21,
    "Triple Jump (Outdoors)": 21,
    "Shot Put (Indoors)": 22,
    "Shot Put (Outdoors)": 22,
    "Discus (Outdoors)": 23,
    "Hammer (Outdoors)": 24,
    "Weight Throw (Indoors)": 25,
    "Javelin (Outdoors)": 26,
    "Pentathlon (Indoors)": 27,
    "Heptathlon (Indoors)": 28,
    "Heptathlon (Outdoors)": 28,
    "Decathlon (Outdoors)": 29,
    "300 Meters (Indoors)": 30,
    "500 Meters (Indoors)": 31,
    "55 Meters (Indoors)": 32,
    "55 Hurdles (Indoors)": 33,
    # Rarer season/event combinations that still map to the same event_id.
    # Added so an off-season 1500 / outdoor mile / indoor steeple isn't dropped.
    "1500 Meters (Indoors)": 8,
    "Mile (Outdoors)": 9,
    "10,000 Meters (Indoors)": 12,
    "3000 Steeplechase (Indoors)": 17,
    "600 Meters (Outdoors)": 5,
    "1000 Meters (Outdoors)": 7,
    "300 Meters (Outdoors)": 30,
    "500 Meters (Outdoors)": 31,
}

# event_ids where a BIGGER number is better: jumps, throws (18-26) and the
# multi-events, which are scored on points (27-29).  Everything else is a race
# (smaller is better) - note 30-33 are the indoor sprints 300/500/55m/55mH, so
# a plain ">= 18" threshold would get them wrong.
HIGHER_IS_BETTER_EVENTS = frozenset(range(18, 30))

# Marks that mean "no result" and should never be stored.
NON_MARKS = {"DNF", "DNS", "DQ", "NH", "NM", "NP", "FS", "NT", "FOUL", "SCR", "DNC", "ADV"}


def _event_rows():
    """Derive the 33 `Events` rows (event_id, name, season) from EVENT_IDS."""
    seasons: dict[int, set[str]] = {}
    names: dict[int, str] = {}
    for full, eid in EVENT_IDS.items():
        base, paren = full.rsplit(" (", 1)
        seasons.setdefault(eid, set()).add("i" if paren.startswith("Indoor") else "o")
        # Keep the shortest base name seen (they're all identical per id anyway).
        if eid not in names or len(base) < len(names[eid]):
            names[eid] = base
    rows = []
    for eid in sorted(seasons):
        ss = seasons[eid]
        season = "Both" if ss == {"i", "o"} else ("Indoor" if ss == {"i"} else "Outdoor")
        rows.append((eid, names[eid], season))
    return rows


EVENT_ROWS = _event_rows()


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})


def fetch(url: str) -> BeautifulSoup | None:
    """GET `url` with retries/back-off; return a parsed soup or None."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = _session.get(url, timeout=REQUEST_TIMEOUT)
        except requests.RequestException as exc:
            wait = REQUEST_DELAY * attempt * 3
            print(f"    ! {exc.__class__.__name__} on {url} "
                  f"(try {attempt}/{MAX_RETRIES}); waiting {wait:.0f}s")
            time.sleep(wait)
            continue

        if resp.status_code == 200:
            time.sleep(REQUEST_DELAY)
            return BeautifulSoup(resp.content, "html.parser")

        if resp.status_code in (403, 429, 500, 502, 503, 504):
            wait = REQUEST_DELAY * attempt * 4
            print(f"    ! HTTP {resp.status_code} on {url} "
                  f"(try {attempt}/{MAX_RETRIES}); waiting {wait:.0f}s")
            time.sleep(wait)
            continue

        print(f"    ! HTTP {resp.status_code} on {url}; giving up")
        return None

    print(f"    ! exhausted retries for {url}")
    return None


# ---------------------------------------------------------------------------
# Text clean-up
# ---------------------------------------------------------------------------
_WS = re.compile(r"\s+")
_TOP_ANCHOR = re.compile(r"\s*Top\s*↑?\s*$")
_ATHLETE_ID = re.compile(r"/athletes/(\d+)")
_TRAIL_ALPHA = re.compile(r"[A-Za-z]+$")
_PARENS = re.compile(r"\([^)]*\)")


def normalize_event_name(raw: str) -> str:
    """'400 Meters\\n\\n   (Indoor) Top^' -> '400 Meters (Indoors)'."""
    name = raw.replace("↑", " ")
    name = _WS.sub(" ", name).strip()
    name = _TOP_ANCHOR.sub("", name).strip()
    name = name.replace("(Indoor)", "(Indoors)").replace("(Outdoor)", "(Outdoors)")
    m = re.search(r"^(.*\((?:Indoors|Outdoors)\))", name)
    return (m.group(1) if m else name).strip()


def event_id_for(raw_event_name: str) -> int | None:
    return EVENT_IDS.get(normalize_event_name(raw_event_name))


_FIELD_METRIC = re.compile(r"\s*(\d+(?:\.\d+)?)\s*m(?:\b|$)")


def parse_mark(raw: str) -> Decimal | None:
    """TFRRS mark string -> Decimal.

    Track times  -> seconds  ('1:56.98' -> 116.98, '15:40.80' -> 940.80).
    Field marks  -> metres, imperial half dropped ('8.81m 28\\' 11"' -> 8.81).
    Multi-events -> the point total ('4321' -> 4321).
    DNF/DNS/FOUL/NH/NM/no-mark/unparseable -> None.

    The website stores `mark` unit-less (Decimal(10,2)); which direction counts
    as "better" is decided from the event_id, not from this value.
    """
    s = _PARENS.sub("", raw).strip()             # drop wind / notes: "9.99 (2.1)"
    if not s:
        return None
    metric = _FIELD_METRIC.match(s)              # "8.81m 28' 11\"" -> "8.81"
    if metric:
        try:
            return Decimal(metric.group(1))
        except InvalidOperation:
            return None
    token = s.split()[0]                         # first token: time or points
    token = _TRAIL_ALPHA.sub("", token)          # "10.9h" -> "10.9", "10.50w" -> "10.50"
    if not token or token.upper() in NON_MARKS or not any(ch.isdigit() for ch in token):
        return None
    try:
        if ":" in token:
            minutes, seconds = token.split(":", 1)
            return Decimal(minutes) * 60 + Decimal(seconds)
        return Decimal(token)
    except (InvalidOperation, ValueError):
        return None


_MEET_DATE = re.compile(
    r"^([A-Za-z]{3,9})\s+(\d{1,2})"          # start month + day
    r"(?:-(?:([A-Za-z]{3,9})\s+)?(\d{1,2}))?"  # optional end (month?) + day
    r",?\s*(\d{4})$"                          # year
)
_DATE_FALLBACKS = ("%b %d, %Y", "%b %d %Y", "%B %d, %Y", "%m/%d/%Y", "%Y-%m-%d")


def parse_meet_date(raw: str) -> str | None:
    """Meet date cell -> ISO 'YYYY-MM-DD', using the LAST day of a range.

    Handles 'Feb 15, 2025', 'May  1- 3, 2025', 'Feb 28-Mar  1, 2025',
    'Apr  9-11, 2026'.
    """
    s = raw.strip().strip("()").strip()
    s = _WS.sub(" ", s).replace("- ", "-").replace(" -", "-")
    if not s:
        return None
    m = _MEET_DATE.match(s)
    if m:
        start_mon, start_day, end_mon, end_day, year = m.groups()
        month = (end_mon or start_mon)[:3].title()
        day = end_day or start_day
        try:
            return datetime.strptime(f"{month} {int(day)} {year}", "%b %d %Y").strftime("%Y-%m-%d")
        except ValueError:
            pass
    for fmt in _DATE_FALLBACKS:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Roster
# ---------------------------------------------------------------------------
@dataclass
class RosterEntry:
    athlete_id: int
    first_name: str
    last_name: str
    class_year: str | None       # raw TFRRS token, e.g. "SR-4"
    sex: str                     # "M" / "F"


def parse_roster(soup: BeautifulSoup, sex: str) -> list[RosterEntry]:
    """Pull athletes from the team page's roster table (header 'NAME | YEAR')."""
    roster_table = None
    for table in soup.find_all("table"):
        head = table.find("tr")
        if not head:
            continue
        labels = [c.get_text(strip=True).upper() for c in head.find_all(["th", "td"])]
        if labels[:2] == ["NAME", "YEAR"]:
            roster_table = table
            break

    entries: dict[int, RosterEntry] = {}
    if roster_table is None:
        # Fallback: any 2-cell row on the page that links to an athlete.
        rows = [a.find_parent("tr") for a in soup.find_all("a", href=_ATHLETE_ID)]
    else:
        rows = roster_table.find_all("tr")

    for row in rows:
        if row is None:
            continue
        link = row.find("a", href=_ATHLETE_ID)
        if not link:
            continue
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        m = _ATHLETE_ID.search(link.get("href", ""))
        if not m:
            continue
        athlete_id = int(m.group(1))
        name = link.get_text(" ", strip=True) or cells[0].get_text(" ", strip=True)
        if "," not in name:
            continue
        last, first = (part.strip() for part in name.split(",", 1))
        if not first or not last:
            continue
        class_year = cells[1].get_text(strip=True) or None
        entries[athlete_id] = RosterEntry(athlete_id, first, last, class_year, sex)

    return list(entries.values())


# ---------------------------------------------------------------------------
# Event history (career progression)
# ---------------------------------------------------------------------------
@dataclass
class Performance:
    athlete_id: int
    event_id: int
    mark: Decimal
    season: str                  # "i" / "o"
    date: str                    # ISO YYYY-MM-DD
    result_link: str | None


def parse_history(soup: BeautifulSoup, athlete_id: int) -> list[Performance]:
    """Every valid individual result from <div id="event-history">.

    That block holds one table per event/season, each row a single performance
    with a link to the meet results. Relays and untracked events are skipped,
    as are DNF/DNS/FOUL/NH rows.
    """
    out: list[Performance] = []
    block = soup.find("div", id="event-history")
    if block is None:
        return out

    for table in block.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        raw_name = rows[0].get_text(" ", strip=True)
        event_name = normalize_event_name(raw_name)
        if "Relay" in raw_name or " x " in raw_name.lower():
            continue
        event_id = EVENT_IDS.get(event_name)
        if event_id is None:
            continue
        season = "o" if event_name.endswith("(Outdoors)") else "i"

        for row in rows[1:]:
            cells = row.find_all("td")
            if len(cells) < 3:
                continue
            mark = parse_mark(cells[0].get_text(" ", strip=True))
            if mark is None:
                continue
            date = parse_meet_date(cells[2].get_text(" ", strip=True))
            if date is None:
                continue
            link_tag = cells[0].find("a", href=True)
            link = link_tag["href"] if link_tag else None
            if link:
                if link.startswith("/"):
                    link = TFRRS_BASE + link
                if link.startswith("#"):
                    link = None
            out.append(Performance(athlete_id, event_id, mark, season, date, link))

    return out
