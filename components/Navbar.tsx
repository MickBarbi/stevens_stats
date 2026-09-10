"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import DesignerLogo from "../public/Designer.jpeg";
import ThemeToggle from "./ThemeToggle";
import { openSearch } from "@/lib/search";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/roster", label: "Roster" },
  { href: "/events", label: "Events" },
  { href: "/records", label: "Top 10" },
  { href: "/athlete", label: "Athletes" },
  { href: "/compare", label: "Compare" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const openBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const everOpened = useRef(false);

  // close the drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  // lock body scroll + Escape-to-close while the drawer is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // move focus into the drawer on open, back to the trigger on close
  useEffect(() => {
    if (open) {
      everOpened.current = true;
      closeBtnRef.current?.focus();
    } else if (everOpened.current) {
      openBtnRef.current?.focus();
    }
  }, [open]);

  // keep Tab focus inside the open drawer
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !drawerRef.current) return;
    const items = drawerRef.current.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled])'
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-gradient-to-b from-brand to-brand-hover pt-[env(safe-area-inset-top)] text-brand-fg shadow-card">
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
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-base transition-colors hover:bg-white/10 ${
                    isActive(l.href) ? "bg-white/15 font-semibold" : ""
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openSearch}
                className="ml-1 flex items-center gap-2 rounded-md py-2 pl-3 pr-2 text-base transition-colors hover:bg-white/10"
                aria-label="Search athletes and pages"
              >
                <Search className="h-4 w-4" aria-hidden />
                <kbd className="hidden rounded border border-white/30 px-1.5 py-0.5 text-xs font-medium text-brand-fg/80 md:block">
                  ⌘K
                </kbd>
              </button>
            </li>
            <li className="ml-1">
              <ThemeToggle />
            </li>
          </ul>

          <div className="ml-auto flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search athletes and pages"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
            >
              <Search className="h-5 w-5" aria-hidden />
            </button>
            <ThemeToggle />
            <button
              ref={openBtnRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* mobile slide-in drawer — always mounted so it can animate both ways */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
        onKeyDown={trapTab}
        className={`fixed right-0 top-0 z-[60] flex h-full w-72 max-w-[82vw] flex-col bg-surface-raised pt-[env(safe-area-inset-top)] text-fg shadow-card-hover transition-transform duration-200 sm:hidden ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Menu
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={open ? 0 : -1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                tabIndex={open ? 0 : -1}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`block rounded-md px-3 py-2.5 text-base transition-colors hover:bg-surface ${
                  isActive(l.href)
                    ? "bg-surface font-semibold text-brand"
                    : "text-fg"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
