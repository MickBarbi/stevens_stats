"""Roster/record name -> athletes.json athlete_id.

Shared by top10_relink.py (and, in spirit, photos.py / top10_from_xlsx.py).
Handles accents, nicknames, common short-form first names, multi-word last
names, and TFRRS having the same person under two ids (prefers the one with
results).

    m = Matcher(athletes, has_marks={...}, overrides={"sarahlovelsmith": 8979795})
    m.id_for("Bruno Santana Ferro")   # -> 8681474 or None
"""

from __future__ import annotations

import re
import unicodedata

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
    "ellie": "eleonora", "kris": "kristopher", "maggie": "magdalena",
}

NAME_SUFFIX = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}


def fold(s: str) -> str:
    """lowercase, strip accents and non-letters."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def _first_ok(fl: str, af: str, nick: str | None) -> bool:
    if not fl or not af:
        return False
    if fl == af or af.startswith(fl) or fl.startswith(af):
        return True
    if nick and fl == fold(nick):
        return True
    if ALIAS.get(fl) == af or ALIAS.get(af) == fl:
        return True
    return len(fl) >= 3 and len(af) >= 3 and fl[:3] == af[:3]


class Matcher:
    def __init__(self, athletes, has_marks=None, overrides=None):
        self.by_last: dict[str, list[dict]] = {}
        for a in athletes:
            self.by_last.setdefault(fold(a["last_name"]), []).append(a)
        self.has_marks = set(has_marks or ())
        self.overrides = {fold(k): v for k, v in (overrides or {}).items()}

    def id_for(self, name: str) -> int | None:
        toks = [t for t in name.strip().split() if t.strip(".").lower() not in NAME_SUFFIX]
        if len(toks) < 2:
            return None
        ov = self.overrides.get(fold("".join(toks)))
        if ov is not None:
            return ov
        hits: set[int] = set()
        for p in range(1, len(toks)):
            fl = fold(toks[0]) if p == 1 else fold("".join(toks[:p]))
            last = fold("".join(toks[p:]))
            for a in self.by_last.get(last, []):
                if _first_ok(fold(toks[0]), fold(a["first_name"]), a.get("nickname")) or _first_ok(
                    fl, fold(a["first_name"]), a.get("nickname")
                ):
                    hits.add(a["athlete_id"])
        if len(hits) == 1:
            return next(iter(hits))
        with_marks = hits & self.has_marks
        return next(iter(with_marks)) if len(with_marks) == 1 else None
