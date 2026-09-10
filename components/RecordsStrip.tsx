import Link from "next/link";
import { Trophy } from "lucide-react";
import { seasonHighlights, type SeasonRecord } from "@/lib/data";

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

function Athletes({ r }: { r: SeasonRecord }) {
  if (r.relay && r.members) {
    return (
      <>
        {r.members.map((m, i) => (
          <span key={i}>
            {i > 0 && ", "}
            {m.athlete_id ? (
              <Link href={`/athlete/${m.athlete_id}`} className="hover:text-link">
                {m.name}
              </Link>
            ) : (
              m.name
            )}
          </span>
        ))}
      </>
    );
  }
  if (r.athlete_id) {
    return (
      <Link href={`/athlete/${r.athlete_id}`} className="hover:text-link">
        {r.name}
      </Link>
    );
  }
  return <>{r.name}</>;
}

/** "School records this season" strip for the home page. Renders nothing
 *  between seasons, so it sits dormant until the next one starts. */
export default function RecordsStrip() {
  const { seasonYear, records, topTenCount } = seasonHighlights();
  if (records.length === 0) return null;

  const label = `${seasonYear - 1}–${String(seasonYear).slice(-2)}`;

  return (
    <section>
      <h2 className="section-title mb-3 flex items-center gap-2">
        <Trophy className="h-5 w-5 shrink-0 text-brand" aria-hidden />
        School Records
        <span className="text-base font-normal text-fg-subtle">· {label}</span>
      </h2>

      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface-raised">
        {records.map((r, i) => (
          <li key={i} className="px-4 py-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-fg">{r.event_name}</span>
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-fg-subtle">
                {r.gender === "m" ? "M" : "W"} ·{" "}
                {r.season === "indoor" ? "Indoor" : "Outdoor"}
              </span>
              <span className="ml-auto font-mono font-semibold tabular-nums text-fg">
                {r.link ? (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg no-underline hover:text-brand hover:underline"
                  >
                    {r.mark}
                  </a>
                ) : (
                  r.mark
                )}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-fg-muted">
              <Athletes r={r} />
              {r.date && (
                <span className="text-fg-subtle"> · {fmtDate(r.date)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm">
        <Link href="/records" className="text-link hover:underline">
          {topTenCount} top-10 marks this season — see the all-time board →
        </Link>
      </p>
    </section>
  );
}
