import { ReactNode } from "react";

/** Surface panel using the design tokens (bg-surface-raised / border / shadow). */
export default function Card({
  as: Tag = "div",
  interactive = false,
  className = "",
  children,
}: {
  as?: "div" | "article" | "section" | "li";
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`card ${
        interactive
          ? "transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] active:shadow-card active:duration-75"
          : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
