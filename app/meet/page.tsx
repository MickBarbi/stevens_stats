import Link from "next/link";
import { allMeets, seasonYearOf } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import PageHeader from "@/components/ui/PageHeader";

export const metadata = pageMetadata({
  title: "Meets",
  ogTitle: "Stevens Track & Field — Meet Results",
  path: "/meet",
  description:
    "Every meet the Stevens track & field team has competed at, indoor and " +
    "outdoor, back through the program's history — with the team's results " +
    "from each one.",
});

const longDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const seasonLabel = (yr: number) => `${yr - 1}–${String(yr).slice(-2)}`;

export default function MeetsIndexPage() {
  const meets = allMeets(); // already newest-first

  // group into competitive years (Dec rolls forward, like the rest of the site)
  const groups: { year: number; meets: typeof meets }[] = [];
  for (const m of meets) {
    const y = seasonYearOf(new Date(`${m.date}T00:00:00`));
    const last = groups[groups.length - 1];
    if (last && last.year === y) last.meets.push(m);
    else groups.push({ year: y, meets: [m] });
  }

  return (
    <div>
      <PageHeader title="Meets" />
      <p className="-mt-3 mb-8 text-sm text-fg-muted">
        Every meet Stevens has competed at, newest first — {meets.length} in all.
      </p>

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.year}>
            <h2 className="section-title mb-3">{seasonLabel(g.year)} Season</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-raised">
              {g.meets.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/meet/${m.slug}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 transition-colors hover:bg-surface"
                  >
                    <span className="font-medium text-fg">{m.name}</span>
                    <span className="text-xs text-fg-subtle">
                      {longDate(m.date)} · {m.athlete_count}{" "}
                      {m.athlete_count === 1 ? "athlete" : "athletes"} ·{" "}
                      {m.event_count} {m.event_count === 1 ? "event" : "events"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
