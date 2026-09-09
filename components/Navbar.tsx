"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import DesignerLogo from "../public/Designer.jpeg";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/roster", label: "Roster" },
  { href: "/events", label: "Events" },
  { href: "/records", label: "Top 10" },
  { href: "/athlete", label: "Athletes" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const linkClass = (href: string, base: string) =>
    `${base} rounded-md transition-colors hover:bg-white/10 ${
      isActive(href) ? "bg-white/15 font-semibold" : ""
    }`;

  return (
    <header className="sticky top-0 z-50 bg-brand text-brand-fg shadow-card">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <Link href="/home" className="shrink-0">
          <Image
            src={DesignerLogo}
            alt="Stevens Stats"
            width={96}
            height={72}
            priority
            className="rounded-lg object-cover shadow-card"
          />
        </Link>

        <ul className="ml-auto hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={linkClass(l.href, "px-3 py-2 text-base")}>
                {l.label}
              </Link>
            </li>
          ))}
          <li className="ml-1">
            <ThemeToggle />
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="flex flex-col gap-1 border-t border-white/10 px-4 pb-3 pt-1 sm:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={linkClass(l.href, "block px-3 py-2 text-base")}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
