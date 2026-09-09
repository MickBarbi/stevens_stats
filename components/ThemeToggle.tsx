"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Mode = "system" | "light" | "dark";
const CYCLE: Mode[] = ["system", "light", "dark"];

const resolve = (mode: Mode): "light" | "dark" => {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyMode = (mode: Mode) => {
  document.documentElement.setAttribute("data-theme", resolve(mode));
};

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Mode | null) ?? "system";
    setMode(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (((localStorage.getItem("theme") as Mode | null) ?? "system") === "system") {
        applyMode("system");
      }
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  const cycle = () => {
    const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
    setMode(next);
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
    applyMode(next);
  };

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${mode}`}
      aria-label={`Theme: ${mode}. Click to switch.`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-brand-fg transition-colors hover:bg-white/10"
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
