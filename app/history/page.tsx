import Link from "next/link";
import { History } from "lucide-react";
import { sortedCoaches, sortedAlumni } from "@/lib/data";
import { pageMetadata } from "@/lib/site";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import HistoryJumpNav from "./HistoryJumpNav";

export const metadata = pageMetadata({
  title: "Program History",
  path: "/history",
  description:
    "Head coaches and notable alumni from Stevens track & field and cross " +
    "country history, drawn from the program's newspaper archive.",
});

const yearLabel = (year: number, approximate: boolean) =>
  approximate ? `${year}?` : `${year}`;

const scrollMt = "scroll-mt-[calc(144px+env(safe-area-inset-top))]";

export default function HistoryPage() {
  // Most recent coach first; gaps are shown against the next (older) entry.
  const coaches = sortedCoaches();
  const alumni = sortedAlumni();

  return (
    <div className="space-y-10">
      <PageHeader title="Program History" />
      <HistoryJumpNav />

      <section id="alumni" className={scrollMt}>
        <h2 className="section-title mb-4">Notable Alumni</h2>
        {alumni.length === 0 ? (
          <EmptyState icon={History} title="No notable alumni recorded yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {alumni.map((a) => (
              <Card key={a.alumnus_id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-fg">{a.name}</span>
                  <span className="text-sm text-fg-muted">{a.years_label}</span>
                </div>
                <p className="mt-2 text-sm text-fg">{a.note}</p>
                {a.athlete_id != null && (
                  <Link
                    href={`/athlete/${a.athlete_id}`}
                    className="mt-2 inline-block text-sm text-link hover:underline"
                  >
                    View athlete profile →
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section id="coaches" className={scrollMt}>
        <h2 className="section-title mb-4">Head Coaches</h2>
        {coaches.length === 0 ? (
          <EmptyState icon={History} title="No coaching history recorded yet." />
        ) : (
          <div className="space-y-3">
            {coaches.map((c, i) => {
              const next = coaches[i + 1]; // next-older coach, chronologically before c
              const gap = next?.end_year != null ? c.start_year - next.end_year : 0;
              return (
                <div key={c.coach_id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold text-fg">
                        {c.name}
                        {c.athlete_id != null && (
                          <Link
                            href={`/athlete/${c.athlete_id}`}
                            className="ml-2 text-sm text-link hover:underline"
                          >
                            athlete profile
                          </Link>
                        )}
                      </span>
                      <span className="text-sm text-fg-muted">
                        {yearLabel(c.start_year, c.start_year_approximate)}
                        {" – "}
                        {c.end_year == null
                          ? "…"
                          : yearLabel(c.end_year, c.end_year_approximate)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-fg-subtle">{c.role}</p>
                    {c.note && <p className="mt-2 text-sm text-fg">{c.note}</p>}
                  </Card>
                  {gap > 3 && (
                    <p className="my-2 text-sm italic text-fg-subtle">
                      No head coach on record for roughly {gap} years
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
