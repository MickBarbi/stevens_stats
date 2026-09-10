import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { allMeets, meetBySlug, type MeetResult } from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import { SITE_URL, TEAM_NAME, pageMetadata } from "@/lib/site";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return allMeets().map((m) => ({ slug: m.slug }));
}

export const dynamicParams = false;

const longDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const seasonWord = (results: MeetResult[]): string | null => {
  const s = new Set(results.map((r) => r.season));
  if (s.size !== 1) return null;
  return s.has("i") ? "Indoor" : "Outdoor";
};

const SEX_ORDER: Record<string, number> = { m: 0, f: 1 };
const sexLabel = (sex: string | null) =>
  sex === "m" ? "Men" : sex === "f" ? "Women" : "";

// Results for one meet, grouped: event (by event_id) -> sex -> best-first.
type EventGroup = {
  event_id: number;
  event_name: string;
  bySex: { sex: string | null; rows: MeetResult[] }[];
};

const groupResults = (results: MeetResult[]): EventGroup[] => {
  const byEvent = new Map<number, MeetResult[]>();
  for (const r of results) {
    const arr = byEvent.get(r.event_id);
    if (arr) arr.push(r);
    else byEvent.set(r.event_id, [r]);
  }

  return Array.from(byEvent.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([event_id, rs]) => {
      const bySexMap = new Map<string | null, MeetResult[]>();
      for (const r of rs) {
        const arr = bySexMap.get(r.sex);
        if (arr) arr.push(r);
        else bySexMap.set(r.sex, [r]);
      }
      const bySex = Array.from(bySexMap.entries())
        .sort(
          (a, b) =>
            (SEX_ORDER[a[0] ?? ""] ?? 9) - (SEX_ORDER[b[0] ?? ""] ?? 9)
        )
        .map(([sex, list]) => ({
          sex,
          rows: list.sort((x, y) =>
            x.higher_is_better ? y.mark - x.mark : x.mark - y.mark
          ),
        }));
      return { event_id, event_name: rs[0].event_name, bySex };
    });
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const meet = meetBySlug((await params).slug);
  if (!meet) return {};
  const year = meet.date.slice(0, 4);
  const season = seasonWord(meet.results);
  const titleYear = meet.name.includes(year) ? meet.name : `${meet.name} (${year})`;
  return pageMetadata({
    title: titleYear,
    ogTitle: `${titleYear} — Stevens Track & Field`,
    path: `/meet/${meet.slug}`,
    description:
      `Stevens Institute of Technology ${season ? `${season.toLowerCase()} ` : ""}` +
      `track & field results from ${meet.name} on ${longDate(meet.date)} — ` +
      `${meet.athlete_count} athletes across ${meet.event_count} events, ` +
      `with personal bests and school records flagged.`,
  });
}

export default async function MeetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meet = meetBySlug(slug);
  if (!meet) notFound();

  const groups = groupResults(meet.results);
  const season = seasonWord(meet.results);
  const showSexHeadings = (g: EventGroup) => g.bySex.length > 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: meet.name,
    startDate: meet.date,
    sport: "Track and field",
    url: `${SITE_URL}/meet/${meet.slug}`,
    competitor: { "@type": "SportsTeam", name: TEAM_NAME },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <PageHeader title={meet.name} />

      <p className="-mt-3 mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
        <span>{longDate(meet.date)}</span>
        {season && (
          <>
            <span aria-hidden>·</span>
            <span>{season}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>
          {meet.athlete_count}{" "}
          {meet.athlete_count === 1 ? "athlete" : "athletes"} ·{" "}
          {meet.result_count} {meet.result_count === 1 ? "result" : "results"} ·{" "}
          {meet.event_count} {meet.event_count === 1 ? "event" : "events"}
        </span>
        <span aria-hidden>·</span>
        <a
          href={meet.tfrrs_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-link hover:underline"
        >
          Full results on TFRRS
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </p>

      <div className="space-y-8">
        {groups.map((g) => {
          const kind = markKind(g.event_id);
          return (
            <section key={g.event_id}>
              <h2 className="section-title mb-3">{g.event_name}</h2>
              <div className="space-y-4">
                {g.bySex.map(({ sex, rows }) => (
                  <div key={sex ?? "x"}>
                    {showSexHeadings(g) && sexLabel(sex) && (
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                        {sexLabel(sex)}
                      </h3>
                    )}
                    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-raised">
                      {rows.map((r) => (
                        <li
                          key={r.performance_id}
                          className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 py-2.5 ${
                            r.is_personal_best ? "feed-pb" : ""
                          }`}
                        >
                          <Link
                            href={`/athlete/${r.athlete_id}`}
                            className="font-medium text-fg hover:text-link"
                          >
                            {r.athlete_name}
                          </Link>

                          <span className="ml-auto font-mono tabular-nums text-fg">
                            {r.result_link ? (
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
                            )}
                          </span>

                          {r.team_rank === 1 && r.is_overall_best && (
                            <Badge kind="sr" />
                          )}
                          {r.is_personal_best && <Badge kind="pb" />}
                          {!r.is_personal_best && r.is_season_best && (
                            <Badge kind="sb" />
                          )}
                          {!r.is_personal_best && r.pb_mark != null && (
                            <span className="text-xs text-fg-subtle">
                              PB {formatMark(r.pb_mark, kind)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
