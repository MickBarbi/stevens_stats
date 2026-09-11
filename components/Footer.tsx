import Link from "next/link";
import { latestMarkDate } from "@/lib/data";
import { SITE_NAME } from "@/lib/site";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/roster", label: "Roster" },
  { href: "/events", label: "Events" },
  { href: "/meet", label: "Meets" },
  { href: "/records", label: "Top 10" },
  { href: "/compare", label: "Compare" },
];

export default function Footer() {
  const last = latestMarkDate();
  const asOf = last
    ? new Date(last + "T00:00:00").toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] text-sm text-fg-muted sm:flex-row sm:items-start sm:justify-between sm:pb-8">
        <div className="space-y-1">
          <p className="font-semibold text-fg">{SITE_NAME}</p>
          <p className="max-w-md text-xs">
            A personal project — not affiliated with, or endorsed by, Stevens
            Institute of Technology. Results are publicly available data from{" "}
            <a
              href="https://www.tfrrs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              TFRRS
            </a>
            .
          </p>
          {asOf && (
            <p className="text-xs text-fg-subtle">Results current as of {asOf}.</p>
          )}
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs"
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-fg hover:underline">
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/MickBarbi/stevens_stats"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg hover:underline"
          >
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
