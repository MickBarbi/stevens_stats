"use client";

import { useState } from "react";
import Link from "next/link";
import type { TopTenList } from "@/lib/data";
import PageHeader from "@/components/ui/PageHeader";

const nameCol = (l: TopTenList, e: TopTenList["entries"][number]) => {
  if (l.relay) return (e.names ?? []).join(", ");
  if (e.athlete_id) {
    return (
      <Link href={`/athlete/${e.athlete_id}`} className="font-sans text-link hover:underline">
        {e.name}
      </Link>
    );
  }
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
          className="field-select"
          value={gender}
          onChange={(e) => setGender(e.target.value as "m" | "f")}
        >
          <option value="m">Men</option>
          <option value="f">Women</option>
        </select>
        <select
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
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="text-left">Athlete</th>
                      <th>Mark</th>
                      <th>Date</th>
                      <th className="text-left">Meet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.entries
                      .slice()
                      .sort((a, b) => a.rank - b.rank)
                      .map((e, i) => (
                        <tr key={i}>
                          <td>{e.rank}</td>
                          <td className="text-left">{nameCol(l, e)}</td>
                          <td className="font-mono tabular-nums">{e.mark}</td>
                          <td className="text-fg-muted">{e.date ?? ""}</td>
                          <td className="text-left text-fg-muted">{e.meet ?? ""}</td>
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
