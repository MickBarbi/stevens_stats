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
              <Link href={`/athlete/${m.athlete_id}`} className="hover:text-brand">
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
      <Link href={`/athlete/${r.athlete_id}`} className="hover:text-brand">
        {r.name}
      </Link>
    );
  }
  return <>{r.name}</>;
}

/** "School records this season" strip for the home page — the fastest,
 *  longest and highest marks in program history, so it gets its own
 *  brand-lit panel. Renders nothing between seasons. */
export default function RecordsStrip() {
  const { seasonYear, records, topTenCount } = seasonHighlights();
  if (records.length === 0) return null;

  const label = `${seasonYear - 1}–${String(seasonYear).slice(-2)}`;

  return (
    <section aria-labelledby="school-records">
      <div className="overflow-hidden rounded-card border border-[color:color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-wash shadow-card">
        {/* header */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-brand to-brand-hover px-4 py-2.5 text-brand-fg">
          <Trophy className="h-5 w-5 shrink-0" aria-hidden />
          <h2
            id="school-records"
            className="text-sm font-bold uppercase tracking-wide"
          >
            School Records
            <span className="font-medium text-brand-fg/75"> · {label}</span>
          </h2>
        </div>

        {/* rows */}
        <ul className="divide-y divide-[color:color-mix(in_srgb,var(--brand)_16%,transparent)]">
          {records.map((r, i) => (
            <li key={i} className="px-4 py-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-fg-subtle">
                {r.event_name}
                <span className="text-fg-subtle/70">
                  {" · "}
                  {r.gender === "m" ? "Men" : "Women"}
                  {" · "}
                  {r.season === "indoor" ? "Indoor" : "Outdoor"}
                </span>
              </p>

              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-mono text-2xl font-bold leading-none tracking-tight tabular-nums text-brand">
                  {r.link ? (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline hover:underline"
                    >
                      {r.mark}
                    </a>
                  ) : (
                    r.mark
                  )}
                </span>
                <span className="text-sm text-fg-muted">
                  <Athletes r={r} />
                  {r.date && (
                    <span className="text-fg-subtle"> · {fmtDate(r.date)}</span>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-sm">
        <Link href="/records" className="text-link hover:underline">
          {records.length} school records · {topTenCount} top-10 marks this
          season — see the all-time board →
        </Link>
      </p>
    </section>
  );
}
