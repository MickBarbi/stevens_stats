# Stevens archives extraction

Working notes for pulling structured data out of the 7 Google Slides decks of
scanned newspaper clippings (Stevens XC/T&F, pre-1920s–2000s), plus a script
for searching the source archive site directly. This directory keeps the
process consistent and the output somewhere durable.

## 0. Searching the source site directly (`search_cdm.py`)

The archive site (stevensarchives.contentdm.oclc.org) is a CONTENTdm instance.
It doesn't advertise an API on the page, but it has one — see the docstring
in `search_cdm.py` for the endpoints. Every newspaper/magazine page was OCR'd
at ingestion, so this script can search by keyword (optionally with a date
range) and pull back the exact page text and a link, instead of clicking
through the site's viewer page by page.

```sh
python search_cdm.py "al alonso" --start-date 1980 --end-date 1985
python search_cdm.py gingrich --no-fulltext   # fast: just list matching issues
```

Use this to verify/extend an existing `coaches.json` / `alumni.json` entry,
or to check something before typing it in by hand. It only covers the Stute
and Indicator collections (both catalogued 1904/1884–2000, same as the Slides
decks below) — nothing here helps for the post-2000 coaching timeline, which
was filled in from personal knowledge / outside sources instead.

It already turned up more than the existing Slides-deck pass caught in a spot
check: `coaches.json`'s Gingrich entry cites two clippings, both fall 1929
("Needs more research"); a `search_cdm.py gingrich` search found 9 mentions
from Feb 1928 through Nov 1929, including his department (Language) and that
he ran cross country at Penn before coaching it here — pushing his likely
start back a full year earlier than what's currently recorded.

## 1. Export each deck

Google Slides → **File → Download → PDF Document**, once per deck. This is
the only bulk export Slides offers, and it keeps whatever resolution the
images were pasted in at — no re-compression on the way out.

Before doing all 7: export one, zoom into an article on-screen, and confirm
the text is actually legible. If it isn't, the deck's source images were
already downsized before this point and no amount of downstream processing
fixes that — worth knowing before spending time on the rest.

Name them predictably, e.g. `deck1.pdf` … `deck7.pdf`, so "deck" + "slide" (a
PDF page number) always identifies exactly one source image later.

## 2. Extract, in batches, via claude.ai

Use the prompt in `EXTRACTION_PROMPT.md`. **Start a fresh chat per batch** —
even a second batch from the same deck — and attach that deck's PDF fresh
each time. Reusing one long chat across batches lets old context crowd out
attention on the new slides and degrades transcription quality; a clean
per-batch chat keeps every batch as careful as the first.

- **Batch size:** start with a test batch of ~10–15 slides on one deck.
  Check the output — is the transcription accurate, are illegible bits
  flagged rather than guessed, is the JSON well-formed? If it holds up,
  batches of ~20–25 slides are a reasonable default; drop back down if a
  larger batch starts skimming.
- Fill in `<START>`–`<END>`, `<DECK NAME>` in the prompt, attach the PDF,
  send.
- Copy the JSON array it returns straight back into the Claude Code
  conversation — say which deck/slide range it covers and paste it in. It
  gets saved under `batches/` and validated against the schema below.

## 3. Output schema

One JSON object per article or photo (a slide can produce zero, one, or
several). See `EXTRACTION_PROMPT.md` for the exact shape — `deck` + `slide`
is the traceability key back to a specific PDF page if the source image is
ever needed again (e.g. to re-check a transcription, or to pull the scan
itself for an eventual archives page).

## 4. What happens with it

Once there's a real batch to look at, decide per-article:

- **Most of it** → becomes the content for a future `/archives` (or similar)
  page on the site: browsable history, the transcription, the scan, tagged
  by sport/era/notability. This is the natural home for the bulk of what
  comes out of this — these are stories and photos, not tabular results.
- **A small, hand-verified subset** → a mark/date/name an article reports
  clearly enough, from before the site's scraped TFRRS coverage (~2008 on),
  could extend `data/top10.json` — already explicitly hand-maintained for
  entries without a TFRRS link. This needs a human confirming each one
  individually; old newspaper reporting on exact marks is exactly the kind
  of thing that's sometimes wrong.

No aggregation/build script yet — that gets written once there's a first real
batch to build it against, rather than guessing at the shape now.
