"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3, UserRound } from "lucide-react";

const TABS = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/roster", label: "Roster", Icon: Users },
  { href: "/events", label: "Events", Icon: BarChart3 },
  { href: "/athlete", label: "Athletes", Icon: UserRound },
];

/** Mobile-only bottom navigation for one-thumb use at a meet. The full link set
 *  (incl. Top 10) lives in the header drawer. */
export default function BottomTabs() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgb(0_0_0/0.06)] sm:hidden"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium transition-colors ${
              active ? "text-brand" : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
