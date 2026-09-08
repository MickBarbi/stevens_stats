# data/

The site's entire dataset. `lib/data.ts` imports these at build time; there is
no database. Files are small enough to keep in git — the history *is* the backup.

## Scraper-generated (do not hand-edit)

`scraper/load.py` overwrites these on every run:

| File | Contents |
|---|---|
| `athletes.json` | One entry per athlete. `first_name`, `last_name`, `year`, `sex`, `active` come from the roster scrape. `nickname`, `bio`, `image_path`, `graduation_year`, `awards` are **preserved** across re-scrapes — edit those here. Athletes no longer on the roster stay in the file with `"active": false`. |
| `events.json` | The 33 events (`event_id`, `event_name`, `event_season`). |
| `performances.json` | Every result, with `is_personal_best` / `is_collegiate_best` / `is_overall_best` / `is_season_best` flags. `mark` is unit-less (track = seconds, field = metres, multis = points). |

Regenerate:

```bash
python scraper/roster.py && python scraper/history.py && python scraper/load.py
```

## Hand-maintained

`load.py` creates these empty if missing and never overwrites them:

**`qualifying_standards.json`** — array of:

```json
{
  "event_id": 6,
  "gender": "m",
  "season": "indoor",
  "mac_qualifying_standard": 115.5,
  "aartfc_qualifying_standard": 113.0
}
```

`gender` is `"m"` / `"f"`. Marks use the same unit-less convention as performances
(`null` if there's no standard).

**`blog_posts.json`** — array of:

```json
{
  "post_id": 1,
  "title": "...",
  "subheading": "...",
  "body": "...",
  "author": "...",
  "created_on": "2026-01-15"
}
```

`post_id` must be unique; `created_on` is `YYYY-MM-DD` (newest sorts first).
