"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RosterEntry } from "@/lib/data";
import { formatMark, markKind } from "@/lib/format";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import AthletePhoto from "@/components/ui/AthletePhoto";

type EventOpt = { event_id: number; event_name: string; higher_is_better: boolean };

const YEAR_LABEL: Record<number, string> = {
  1: "First-Year",
  2: "Sophomore",
  3: "Junior",
  4: "Senior",
  5: "Grad Student",
  6: "Grad Student",
};

const RosterClient = ({
  entries,
  events,
}: {
  entries: RosterEntry[];
  events: EventOpt[];
}) => {
  const [eventId, setEventId] = useState("");
  const [year, setYear] = useState("");
  const [sex, setSex] = useState("");

  // only events a rostered athlete has actually competed in
  const eventOpts = useMemo(() => {
    const ids = new Set<number>();
    for (const e of entries) for (const m of e.marks) ids.add(m.event_id);
    return events.filter((e) => ids.has(e.event_id));
  }, [entries, events]);

  const selectedEvent = eventId
    ? events.find((e) => e.event_id === Number(eventId)) ?? null
    : null;

  const visible = useMemo(() => {
    const list = entries.filter((e) => {
      const a = e.athlete;
      if (sex !== "" && a.sex !== sex) return false;
      if (year !== "") {
        const y = String(a.year);
        if (y !== year && !(y === "6" && year === "5")) return false;
      }
      if (
        selectedEvent &&
        !e.marks.some((m) => m.event_id === selectedEvent.event_id)
      )
        return false;
      return true;
    });

    if (selectedEvent) {
      const markOf = (e: RosterEntry) =>
        e.marks.find((m) => m.event_id === selectedEvent.event_id)!.mark;
      list.sort((a, b) =>
        selectedEvent.higher_is_better ? markOf(b) - markOf(a) : markOf(a) - markOf(b)
      );
    }
    return list;
  }, [entries, sex, year, selectedEvent]);

  return (
    <div>
      <PageHeader title="Roster">
        <select
          className="field-select"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <option value="">All Events</option>
          {eventOpts.map((e) => (
            <option key={e.event_id} value={e.event_id}>
              {e.event_name}
            </option>
          ))}
        </select>
        <select
          className="field-select"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">All Grades</option>
          <option value="1">First-Years</option>
          <option value="2">Sophomores</option>
          <option value="3">Juniors</option>
          <option value="4">Seniors</option>
          <option value="5">Grad Students</option>
        </select>
        <select
          className="field-select"
          value={sex}
          onChange={(e) => setSex(e.target.value)}
        >
          <option value="">All Genders</option>
          <option value="m">Men</option>
          <option value="f">Women</option>
        </select>
      </PageHeader>

      <p className="mb-4 text-sm text-fg-muted">
        {visible.length} {visible.length === 1 ? "athlete" : "athletes"}
        {selectedEvent ? ` · ranked by ${selectedEvent.event_name} PB` : ""}
      </p>

      {visible.length === 0 ? (
        <p className="text-fg-muted">No athletes match these filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((e, i) => {
            const a = e.athlete;
            const name = `${a.nickname ? a.nickname : a.first_name} ${a.last_name}`;
            const mark = selectedEvent
              ? e.marks.find((m) => m.event_id === selectedEvent.event_id)!.mark
              : null;
            return (
              <Link key={a.athlete_id} href={`/athlete/${a.athlete_id}`} className="block">
                <Card interactive className="h-full overflow-hidden">
                  <div className="relative aspect-[3/4] bg-surface">
                    <AthletePhoto
                      athlete={a}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {e.recentBest && (
                      <span
                        title="Most recent result was a personal best"
                        className="absolute right-2 top-2 h-3 w-3 rounded-full bg-pb ring-2 ring-white"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="font-semibold leading-tight text-fg">{name}</h2>
                    <p className="mt-1.5">
                      <span className="chip">
                        {YEAR_LABEL[a.year] ?? `Year ${a.year}`}
                      </span>
                    </p>

                    {selectedEvent ? (
                      <p className="mt-2 font-mono text-sm tabular-nums text-fg">
                        {formatMark(mark as number, markKind(selectedEvent.event_id))}{" "}
                        <span className="text-fg-subtle">#{i + 1}</span>
                      </p>
                    ) : e.specialties.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {e.specialties.slice(0, 2).map((s) => (
                          <span
                            key={s.event_id}
                            className="rounded-full border border-border bg-surface px-1.5 py-0.5 text-[0.7rem] font-medium text-fg-muted"
                          >
                            {s.event_name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RosterClient;
