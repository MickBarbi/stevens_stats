"use client";

const SECTIONS = [
  { id: "alumni", label: "Notable Alumni" },
  { id: "coaches", label: "Head Coaches" },
];

const scrollTo = (id: string) => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

// Jump bar mirroring the /events "jump-to-event" nav — sticks just under the
// app header so you can hop straight to Head Coaches without scrolling past
// the alumni cards.
export default function HistoryJumpNav() {
  return (
    <nav
      aria-label="Jump to section"
      className="sticky top-[calc(87px+env(safe-area-inset-top))] z-30 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-y border-border bg-bg px-4 py-2 sm:mx-0 sm:rounded-lg sm:border"
    >
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => scrollTo(s.id)}
          className="chip shrink-0 whitespace-nowrap transition-transform hover:border-link hover:text-fg active:scale-95"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
