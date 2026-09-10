// Mark display. Marks are stored unit-less; how to render one depends on the
// event: running events are seconds (shown as m:ss.hh over a minute, else
// ss.hh), field events are metres (always 2 dp), the multi-events are integer
// points. The event-id ranges match HIGHER_IS_BETTER_EVENTS in the scraper.

export type MarkKind = "time" | "distance" | "points";

export const markKind = (eventId: number): MarkKind => {
  if (eventId >= 27 && eventId <= 29) return "points"; // pentathlon / heptathlon / decathlon
  if (eventId >= 18 && eventId <= 26) return "distance"; // jumps + throws
  return "time";
};

export const formatMark = (
  value: number | string | null | undefined,
  kind: MarkKind = "time"
): string => {
  if (value === null || value === undefined || value === "-" || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";

  if (kind === "points") return String(Math.round(n));
  if (kind === "time" && n >= 60) {
    const minutes = Math.floor(n / 60);
    return `${minutes}:${(n - minutes * 60).toFixed(2).padStart(5, "0")}`;
  }
  return n.toFixed(2);
};
