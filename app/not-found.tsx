import Link from "next/link";
import Image from "next/image";
import DesignerLogo from "../public/Designer.jpeg";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/roster", label: "Roster" },
  { href: "/meet", label: "Meets" },
  { href: "/records", label: "Top 10" },
  { href: "/athlete", label: "Athletes" },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center sm:py-24">
      <Image
        src={DesignerLogo}
        alt=""
        width={110}
        height={82}
        className="rounded-xl opacity-90 shadow-card"
      />
      <h1 className="page-title after:mx-auto">Off the track</h1>
      <p className="text-fg-muted">
        That page isn&apos;t here — it may be an old link, or a meet or athlete
        that isn&apos;t in the data.
      </p>
      <nav
        aria-label="Go to"
        className="mt-2 flex flex-wrap justify-center gap-2 text-sm"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md border border-border px-3 py-1.5 text-fg-muted transition-colors hover:border-[color:var(--border-hover)] hover:text-fg"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
