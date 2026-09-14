# Archive extraction prompt

Copy this whole block into a **fresh** claude.ai chat, attach the deck's PDF,
and fill in the three `<...>` blanks. Fresh chat per batch — don't reuse a
conversation for a second batch, even against the same deck (see README).

---

You are transcribing a batch of scanned historical newspaper clippings about
Stevens Institute of Technology's cross country and track & field teams. Each
slide in the attached PDF may contain one or more separate newspaper articles
or photos, and may also have a typed caption added by whoever built the deck —
use the caption too if there is one, it may have a date or context the scan
itself lacks.

For slides <START>–<END> of "<DECK NAME>" (PDF page numbers), go through each
slide **one at a time**. For each distinct article or photo you find, extract
one JSON object. A single slide may produce more than one object if it has
multiple articles/photos; a slide with nothing legible (blank, a divider,
purely decorative) can be skipped entirely.

Read every word you can, but do not guess at illegible text. If a word, name,
date, or number is unclear, either omit it or mark it clearly (e.g.
"[illegible]" or "Sm?th" for an uncertain name) rather than presenting an
uncertain reading as fact. Getting a name, date, or mark **wrong** is worse
than leaving it blank — this is going into a historical record.

For each article, output:

```json
{
  "deck": "<deck name>",
  "slide": <PDF page number, integer>,
  "headline": "<the article's headline/title, or null>",
  "date": "<YYYY-MM-DD, YYYY-MM, or YYYY — whatever precision you can actually determine, else null>",
  "date_confidence": "exact" | "approximate" | "unknown",
  "sport": "cross_country" | "track_field" | "both" | "unclear",
  "names": ["<athlete/coach names mentioned>"],
  "meet_or_event": "<meet, competition, or event name if mentioned, else null>",
  "transcription": "<as much of the article's body text as you can read, verbatim>",
  "summary": "<1-2 sentence plain-English summary of what happened>",
  "notability": "record" | "championship" | "notable_alumnus" | "photo_only" | "routine" | "other",
  "notability_note": "<why it's notable, if it is, else null>",
  "confidence_notes": "<anything uncertain — illegible sections, ambiguous names/dates, guessed context — else null>"
}
```

Return **only** a JSON array of these objects (one entry per article/photo
found, in slide order), wrapped in a single \`\`\`json code block. No other
text before or after it.
