"use client";

import { useState } from "react";
import Link from "next/link";
import type { TopTenList } from "@/lib/data";
import PageHeader from "@/components/ui/PageHeader";

// `!font-sans` beats `.data-table a { font-mono }` (equal specificity, so the
// utility needs the bang) — names read as names, not monospaced marks.
const athleteLink = (id: number, text: string) => (
  <Link href={`/athlete/${id}`} className="!font-sans text-link hover:underline">
    {text}
  </Link>
);

const nameCol = (l: TopTenList, e: TopTenList["entries"][number]) => {
  if (l.relay) {
    return (
      <span className="font-sans">
        {(e.members ?? []).map((m, i) => (
          <span key={i}>
            {i > 0 && ", "}
            {m.athlete_id ? athleteLink(m.athlete_id, m.name) : m.name}
          </span>
        ))}
      </span>
    );
  }
  if (e.athlete_id) return athleteLink(e.athlete_id, e.name ?? "");
  return <span className="font-sans">{e.name}</span>;
};

export default function RecordsClient({ lists }: { lists: TopTenList[] }) {
  const [gender, setGender] = useState<"m" | "f">("m");
  const [season, setSeason] = useState<"indoor" | "outdoor">("outdoor");

  if (lists.length === 0) {
    return (
      <div>
        <PageHeader title="Top 10" />
        <p className="text-fg-muted">
          The all-time top-10 lists haven&apos;t been added yet — see{" "}
          <code>data/top10.json</code>.
        </p>
      </div>
    );
  }

  const visible = lists
    .filter((l) => l.gender === gender && l.season === season)
    .sort(
      (a, b) =>
        Number(a.relay) - Number(b.relay) || (a.event_id ?? 999) - (b.event_id ?? 999)
    );

  return (
    <div>
      <PageHeader title="Top 10">
        <select
          aria-label="Gender"
          className="field-select"
          value={gender}
          onChange={(e) => setGender(e.target.value as "m" | "f")}
        >
          <option value="m">Men</option>
          <option value="f">Women</option>
        </select>
        <select
          aria-label="Season"
          className="field-select"
          value={season}
          onChange={(e) => setSeason(e.target.value as "indoor" | "outdoor")}
        >
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
        </select>
      </PageHeader>

      {visible.length === 0 ? (
        <p className="text-fg-muted">No lists for this selection.</p>
      ) : (
        <div className="space-y-8">
          {visible.map((l) => (
            <section key={`${l.event_name}-${l.gender}-${l.season}`}>
              <h2 className="mb-1 text-2xl font-bold text-brand">{l.event_name}</h2>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <caption className="sr-only">
                    {l.event_name} all-time top ten —{" "}
                    {l.gender === "m" ? "men" : "women"}, {l.season}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col" className="text-left">
                        Athlete
                      </th>
                      <th scope="col">Mark</th>
                      <th scope="col">{l.relay ? "Year" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.entries
                      .slice()
                      .sort((a, b) => a.rank - b.rank)
                      .map((e, i) => (
                        <tr key={i}>
                          <td className={e.rank === 1 ? "font-semibold text-brand" : undefined}>
                            {e.rank}
                          </td>
                          <td className="text-left">{nameCol(l, e)}</td>
                          <td className="font-mono tabular-nums">
                            {e.link ? (
                              <a
                                href={e.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-link no-underline hover:underline"
                              >
                                {e.mark}
                              </a>
                            ) : (
                              e.mark
                            )}
                          </td>
                          <td className="text-fg-muted tabular-nums">
                            {l.relay ? e.year ?? "" : e.date ?? ""}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
