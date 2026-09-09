import { ReactNode } from "react";

/** Page title + an optional slot for filter controls, on one line. */
export default function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <h1 className="page-title">{title}</h1>
      {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}
