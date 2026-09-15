# Archive extraction prompt (v2 — local-OCR pipeline)

Copy this whole block into a chat, attach the deck's **.pptx** (not PDF), and fill in the `<...>` blanks.
For decks over ~45 slides, split into batches within the SAME chat (one JSON output per batch) rather than starting a fresh chat per batch — the OCR/extraction setup only needs to happen once per deck.

---

You are transcribing scanned historical newspaper clippings about Stevens Institute of Technology's cross country and track & field teams, from a Google Slides deck exported as .pptx.

**Deck name:** `<DECK NAME>`
**Slide offset:** `<N>` (this deck's slide 1 = archive slide N+1 — set to 0 if this is a standalone deck)
**This batch:** slides `<START>`–`<END>` of the deck (local slide numbers, before offset)

## Pipeline
1. Extract images per-slide at native resolution using python-pptx (not a flattened PDF render), preserving slide grouping and any typed captions on each slide (captions often carry the exact issue date — treat them as authoritative for `date`/`date_confidence` when present).
2. Run Tesseract OCR locally on every extracted image in this batch — no chat-quota cost.
3. For any image where OCR returns empty, near-empty, or clearly garbled text (rotated pages, low-letter-ratio output), view that image directly and transcribe it from vision instead.
4. Skip images under ~80px in either dimension (dividers/rules, not content).

## Extraction rules
Go through slides one at a time. Extract one JSON object per distinct article or photo (a slide with multiple clippings yields multiple objects; a slide with nothing legible can be skipped). Only extract content about Stevens cross country or track & field — note but don't transcribe unrelated content sharing a clipping (skip it, flag it once in `confidence_notes`).

Read every word you can, but do not guess at illegible text — omit or mark it (`[illegible]`, `Sm?th`) rather than presenting an uncertain reading as fact. Getting a name, date, or mark **wrong** is worse than leaving it blank. Flag reconstructed column order, ambiguous bylines, or internally inconsistent marks in `confidence_notes` rather than silently resolving them.

For each article, output:

```json
{
  "deck": "<deck name>",
  "slide": <local slide number + offset, integer>,
  "headline": "<headline/title, or null>",
  "date": "<YYYY-MM-DD, YYYY-MM, or YYYY, else null>",
  "date_confidence": "exact" | "approximate" | "unknown",
  "sport": "cross_country" | "track_field" | "both" | "unclear",
  "names": ["<athlete/coach names mentioned>"],
  "meet_or_event": "<meet/competition name, else null>",
  "transcription": "<article body text, as verbatim as legible>",
  "summary": "<1-2 sentence plain-English summary>",
  "notability": "record" | "championship" | "notable_alumnus" | "photo_only" | "routine" | "other",
  "notability_note": "<why it's notable, else null>",
  "confidence_notes": "<uncertainty, illegible sections, skipped off-topic content, else null>"
}
```

Return **only** a JSON array of these objects (slide order), wrapped in a single \`\`\`json code block. No text before or after it.