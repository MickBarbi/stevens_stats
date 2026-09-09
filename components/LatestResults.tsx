import Link from "next/link";
import { latestResults, type FeedResult } from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import Badge from "@/components/ui/Badge";

const dateLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function LatestResults() {
  const results = latestResults(60);

  if (results.length === 0) {
    return (
      <p className="text-fg-muted">
        No results yet — run the scraper (<code>npm run data</code>).
      </p>
    );
  }

  const groups: { date: string; items: FeedResult[] }[] = [];
  for (const r of results) {
    const last = groups[groups.length - 1];
    if (last && last.date === r.date) last.items.push(r);
    else groups.push({ date: r.date, items: [r] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.date}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            {dateLabel(g.date)}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-raised">
            {g.items.map((r) => {
              const kind = markKind(r.event_id);
              return (
                <li
                  key={r.performance_id}
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-2.5"
                >
                  <Link
                    href={`/athlete/${r.athlete.athlete_id}`}
                    className="font-medium text-fg hover:text-link"
                  >
                    {r.athlete.nickname ? r.athlete.nickname : r.athlete.first_name}{" "}
                    {r.athlete.last_name}
                  </Link>
                  <span className="text-sm text-fg-muted">{r.event_name}</span>

                  <span className="font-mono tabular-nums text-fg">
                    {r.result_link ? (
                      <a
                        href={r.result_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link no-underline hover:underline"
                      >
                        {formatMark(r.mark, kind)}
                      </a>
                    ) : (
                      formatMark(r.mark, kind)
                    )}
                  </span>

                  {/* SR only when THIS mark is the record — i.e. the athlete
                      holds the #1 all-time spot for this event+season AND this
                      result is their best-ever for it. Otherwise every result a
                      record-holder posts wrongly reads as a new record. */}
                  {r.team_rank === 1 && r.is_overall_best && <Badge kind="sr" />}
                  {r.is_personal_best && <Badge kind="pb" />}
                  {!r.is_personal_best && r.is_season_best && <Badge kind="sb" />}

                  {!r.is_personal_best && r.pb_mark != null && (
                    <span className="text-xs text-fg-subtle">
                      PB {formatMark(r.pb_mark, kind)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
