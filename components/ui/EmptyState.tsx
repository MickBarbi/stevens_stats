import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A friendly placeholder for "nothing here (yet)" — filtered-out lists,
 *  missing content, pre-season pages. */
export default function EmptyState({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-card border border-dashed border-border px-6 py-12 text-center ${className}`}
    >
      {Icon ? <Icon className="h-8 w-8 text-fg-subtle" aria-hidden /> : null}
      <p className="font-medium text-fg">{title}</p>
      {children ? (
        <div className="max-w-sm text-sm text-fg-muted">{children}</div>
      ) : null}
    </div>
  );
}
