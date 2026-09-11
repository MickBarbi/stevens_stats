"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import Badge from "@/components/ui/Badge";

// one row of public/calendar.json (built by scripts/gen-calendar.mjs)
type Row = {
  y: number;
  id: number;
  n: string;
  e: string;
  m: string;
  pb?: 0 | 1;
  sr?: 0 | 1;
  meet: { name: string; slug: string } | null;
};

const agoLabel = (n: number) =>
  n === 1 ? "1 year ago" : `${n} years ago`;

/** "On this day" — the same calendar date in Stevens history. Client-side so it
 *  reflects the real day, not the last build. Renders nothing on dates with no
 *  history (most of the off-season). */
export default function OnThisDay() {
  const [entries, setEntries] = useState<Row[] | null>(null);
  const [heading, setHeading] = useState("");
  const [thisYear, setThisYear] = useState(0);

  useEffect(() => {
    let live = true;
    fetch("/calendar.json")
      .then((r) => r.json())
      .then((data: Record<string, Row[]>) => {
        if (!live) return;
        const now = new Date();
        const key = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;
        setEntries(data[key] ?? []);
        setThisYear(now.getFullYear());
        setHeading(
          now.toLocaleDateString(undefined, { month: "long", day: "numeric" })
        );
      })
      .catch(() => setEntries([]));
    return () => {
      live = false;
    };
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <section aria-labelledby="on-this-day" className="card overflow-hidden">
      <h2
        id="on-this-day"
        className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-fg"
      >
        <CalendarClock className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        On this day
        <span className="font-medium normal-case text-fg-subtle">
          · {heading}
        </span>
      </h2>

      <ul className="divide-y divide-border">
        {entries.map((r, i) => (
          <li key={i} className="px-4 py-2.5">
            <div className="flex items-baseline gap-x-2">
              <span className="shrink-0 rounded-full bg-brand-wash px-2 py-0.5 text-xs font-semibold text-brand">
                {agoLabel(thisYear - r.y)}
              </span>
              <Link
                href={`/athlete/${r.id}`}
                className="min-w-0 truncate font-medium text-fg hover:text-link"
              >
                {r.n}
              </Link>
              <span className="ml-auto shrink-0 font-mono font-semibold tabular-nums text-fg">
                {r.m}
              </span>
              {r.sr ? <Badge kind="sr" /> : r.pb ? <Badge kind="pb" /> : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-xs text-fg-subtle">
              <span>{r.e}</span>
              <span aria-hidden>·</span>
              <span>{r.y}</span>
              {r.meet && (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/meet/${r.meet.slug}`}
                    className="hover:text-brand hover:underline"
                  >
                    {r.meet.name}
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
