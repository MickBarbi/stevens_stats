"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowRight,
  CalendarDays,
  Newspaper,
  Search,
  UserRound,
} from "lucide-react";
import { SEARCH_EVENT } from "@/lib/search";

// public/search-index.json — built by scripts/gen-search-index.mjs.
type AthleteRow = { id: number; name: string; sub: string; alt?: string; alum?: 1 };
type MeetRow = { slug: string; name: string; sub: string };
type PostRow = { id: number; name: string; sub: string };
type IndexPayload = { athletes: AthleteRow[]; meets: MeetRow[]; posts: PostRow[] };

type Kind = "page" | "athlete" | "meet" | "post";
type Common = { name: string; sub: string; href: string; _words: string[] };
type PageHit = Common & { kind: "page" };
type AthleteHit = Common & { kind: "athlete"; alum?: 1 };
type MeetHit = Common & { kind: "meet" };
type PostHit = Common & { kind: "post" };
type Hit = PageHit | AthleteHit | MeetHit | PostHit;

const PAGES: { name: string; sub: string; href: string }[] = [
  { name: "Home", sub: "Latest results feed", href: "/home" },
  { name: "Roster", sub: "The full team, filterable", href: "/roster" },
  { name: "Events", sub: "Leaderboards & qualifying standards", href: "/events" },
  { name: "Progression", sub: "Team best by year, event by event", href: "/events/progression" },
  { name: "Meets", sub: "Every meet, newest first", href: "/meet" },
  { name: "Top 10", sub: "All-time top-ten board", href: "/records" },
  { name: "Athletes", sub: "Browse every athlete", href: "/athlete" },
  { name: "Compare", sub: "Two athletes head to head", href: "/compare" },
];

const KIND_LABEL: Record<Kind, string> = {
  page: "Pages",
  athlete: "Athletes",
  meet: "Meets",
  post: "News",
};

const DIACRITICS = /[̀-ͯ]/g;

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const words = (...parts: string[]) =>
  fold(parts.join(" ")).split(" ").filter(Boolean);

// Every query term must be a prefix of some word; score rewards earlier and
// exact-word matches so "kris alv" ranks Kristopher Alvarez first.
const score = (hit: Hit, terms: string[]): number | null => {
  let total = 0;
  for (const t of terms) {
    let best = Infinity;
    hit._words.forEach((w, i) => {
      if (w === t) best = Math.min(best, i);
      else if (w.startsWith(t)) best = Math.min(best, i + 1);
      else if (w.includes(t)) best = Math.min(best, i + 8);
    });
    if (best === Infinity) return null;
    total += best;
  }
  return total;
};

const PAGE_HITS: PageHit[] = PAGES.map((p) => ({
  ...p,
  kind: "page" as const,
  _words: words(p.name, p.sub),
}));

let cache: { athletes: AthleteHit[]; meets: MeetHit[]; posts: PostHit[] } | null =
  null;

async function loadIndex() {
  if (cache) return cache;
  const res = await fetch("/search-index.json");
  const data = (await res.json()) as IndexPayload;
  cache = {
    athletes: data.athletes.map((r) => ({
      kind: "athlete",
      name: r.name,
      sub: r.sub,
      href: `/athlete/${r.id}`,
      alum: r.alum,
      _words: words(r.name, r.alt ?? ""),
    })),
    meets: data.meets.map((r) => ({
      kind: "meet",
      name: r.name,
      sub: r.sub,
      href: `/meet/${r.slug}`,
      // move a leading "2025 " year to the end so "tcnj" still matches the
      // first real word of "2025 TCNJ Invite" — the year stays searchable too
      _words: words(r.name.replace(/^(\d{4})\s+(.+)$/, "$2 $1")),
    })),
    posts: data.posts.map((r) => ({
      kind: "post",
      name: r.name,
      sub: r.sub,
      href: `/home/${r.id}`,
      _words: words(r.name, r.sub),
    })),
  };
  return cache;
}

function Icon({ kind }: { kind: Kind }) {
  const C =
    kind === "athlete"
      ? UserRound
      : kind === "meet"
        ? CalendarDays
        : kind === "post"
          ? Newspaper
          : ArrowRight;
  return <C className="h-4 w-4" aria-hidden />;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<typeof cache>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K toggles; navbar buttons fire SEARCH_EVENT.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(SEARCH_EVENT, onOpen);
    };
  }, []);

  // Fetch the index the first time the palette opens.
  useEffect(() => {
    if (open) loadIndex().then(setIndex);
  }, [open]);

  // Combobox swallows the first Escape (to close its own listbox), so the
  // Dialog needs two. Catch it in the capture phase and close in one press.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [open]);

  const results = useMemo<Hit[]>(() => {
    const terms = fold(query).split(" ").filter(Boolean);
    if (terms.length === 0) return PAGE_HITS;
    if (!index) return [];

    // ties keep the list's own order — athletes are current-team-then-alpha,
    // meets and posts are newest-first — which beats a name-length tiebreak
    // (that buried "2025 TCNJ Invite" under a dozen shorter TCNJ meets).
    const rank = <T extends Hit>(list: readonly T[], cap: number): T[] =>
      list
        .map((h, i) => ({ h, i, s: score(h, terms) }))
        .filter((x): x is { h: T; i: number; s: number } => x.s !== null)
        .sort((a, b) => a.s - b.s || a.i - b.i)
        .slice(0, cap)
        .map((x) => x.h);

    return [
      ...rank(PAGE_HITS, 6),
      ...rank(index.athletes, 6),
      ...rank(index.meets, 6),
      ...rank(index.posts, 4),
    ];
  }, [query, index]);

  const loading = !index && fold(query).length > 0;

  const go = (hit: Hit | null) => {
    if (!hit) return;
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
        setQuery("");
      }}
      initialFocus={inputRef}
      className="relative z-[80]"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setOpen(false);
            setQuery("");
          }
        }}
      >
        <DialogPanel className="card w-full max-w-lg overflow-hidden">
          <DialogTitle className="sr-only">Search Stevens Stats</DialogTitle>
          <Combobox<Hit> onChange={go} immediate>
            <div className="flex items-center gap-2 border-b border-border px-3.5">
              <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              <ComboboxInput
                ref={inputRef}
                aria-label="Search athletes, meets and pages"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-transparent py-3.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                placeholder="Search athletes, meets, pages…"
                onChange={(e) => setQuery(e.target.value)}
                displayValue={() => ""}
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[0.65rem] font-medium text-fg-subtle sm:block">
                Esc
              </kbd>
            </div>

            <ComboboxOptions static className="max-h-[22rem] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-fg-subtle">
                  {loading ? "Searching…" : `No matches for “${query}”`}
                </p>
              ) : (
                results.map((hit, i) => {
                  const showHeader =
                    fold(query).length > 0 &&
                    (i === 0 || results[i - 1].kind !== hit.kind);
                  return (
                    <Fragment key={`${hit.kind}:${hit.href}`}>
                      {showHeader && (
                        <div className="px-3 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-subtle first:pt-1">
                          {KIND_LABEL[hit.kind]}
                        </div>
                      )}
                      <ComboboxOption
                        value={hit}
                        className="group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm data-[focus]:bg-surface"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-wash text-brand">
                          <Icon kind={hit.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-fg">
                              {hit.name}
                            </span>
                            {hit.kind === "athlete" && hit.alum && (
                              <span className="shrink-0 rounded-full border border-border px-1.5 text-[0.6rem] font-semibold uppercase leading-4 text-fg-subtle">
                                alum
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-fg-subtle">
                            {hit.sub}
                          </span>
                        </span>
                      </ComboboxOption>
                    </Fragment>
                  );
                })
              )}
            </ComboboxOptions>
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
