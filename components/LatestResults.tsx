import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { latestResults, type FeedResult } from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

const dateLabel = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

type MeetRef = { name: string; slug: string };

type Group = {
  date: string;
  items: FeedResult[];
  // when every result that day is from one meet, name it once at the date
  // header; when the day spans two or more, name it on each row instead
  soloMeet: MeetRef | null;
  perRowMeet: boolean;
};

export default function LatestResults() {
  const results = latestResults(60);

  if (results.length === 0) {
    return (
      <EmptyState icon={CalendarClock} title="No results in yet">
        Marks show up here as soon as the season gets going — check back after
        the next meet.
      </EmptyState>
    );
  }

  const groups: Group[] = [];
  for (const r of results) {
    const last = groups[groups.length - 1];
    if (last && last.date === r.date) last.items.push(r);
    else groups.push({ date: r.date, items: [r], soloMeet: null, perRowMeet: false });
  }
  for (const g of groups) {
    const bySlug = new Map<string, MeetRef>();
    for (const it of g.items) if (it.meet) bySlug.set(it.meet.slug, it.meet);
    if (bySlug.size === 1) g.soloMeet = [...bySlug.values()][0];
    else if (bySlug.size >= 2) g.perRowMeet = true;
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.date}>
          <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            <span>{dateLabel(g.date)}</span>
            {g.soloMeet && (
              <>
                <span aria-hidden className="opacity-60">
                  ·
                </span>
                <Link
                  href={`/meet/${g.soloMeet.slug}`}
                  className="font-medium normal-case text-fg-muted hover:text-brand hover:underline"
                >
                  {g.soloMeet.name}
                </Link>
              </>
            )}
          </h3>

          <ul className="overflow-hidden rounded-card border border-border bg-surface-raised sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            {g.items.map((r) => {
              const kind = markKind(r.event_id);
              const name = `${
                r.athlete.nickname ? r.athlete.nickname : r.athlete.first_name
              } ${r.athlete.last_name}`;

              const markEl = r.result_link ? (
                <a
                  href={r.result_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg no-underline hover:text-brand hover:underline"
                >
                  {formatMark(r.mark, kind)}
                </a>
              ) : (
                formatMark(r.mark, kind)
              );

              const badges = (
                <>
                  {r.team_rank === 1 && r.is_overall_best && <Badge kind="sr" />}
                  {r.is_personal_best && <Badge kind="pb" />}
                  {!r.is_personal_best && r.is_season_best && <Badge kind="sb" />}
                </>
              );

              const pbCtx =
                !r.is_personal_best && r.pb_mark != null ? (
                  <span className="text-xs text-fg-subtle">
                    PB {formatMark(r.pb_mark, kind)}
                  </span>
                ) : null;

              const meetEl =
                g.perRowMeet && r.meet ? (
                  <Link
                    href={`/meet/${r.meet.slug}`}
                    className="text-xs text-fg-subtle hover:text-brand hover:underline"
                  >
                    {r.meet.name}
                  </Link>
                ) : null;

              return (
                <li
                  key={r.performance_id}
                  className={`flex flex-col gap-0.5 border-b border-border px-4 py-2.5 last:border-0 sm:col-span-full sm:grid sm:grid-cols-subgrid sm:items-baseline sm:gap-x-4 sm:gap-y-0 ${
                    r.is_personal_best ? "feed-pb" : ""
                  }`}
                >
                  {/* line 1 (mobile) / the whole row (desktop, via `contents`) */}
                  <div className="flex items-baseline justify-between gap-3 sm:contents">
                    <Link
                      href={`/athlete/${r.athlete.athlete_id}`}
                      className="min-w-0 truncate font-medium text-fg hover:text-link"
                    >
                      {name}
                    </Link>

                    <span className="hidden whitespace-nowrap text-right text-sm text-fg-muted sm:block">
                      {r.event_name}
                    </span>

                    <span className="shrink-0 font-mono tabular-nums text-fg sm:text-right">
                      {markEl}
                    </span>

                    <span className="hidden items-baseline gap-2 sm:flex">
                      {badges}
                      {pbCtx}
                      {meetEl}
                    </span>
                  </div>

                  {/* line 2 (mobile only): event · meet · badges · PB */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-fg-muted sm:hidden">
                    <span>{r.event_name}</span>
                    {meetEl && (
                      <>
                        <span aria-hidden className="opacity-60">
                          ·
                        </span>
                        {meetEl}
                      </>
                    )}
                    {badges}
                    {pbCtx}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
