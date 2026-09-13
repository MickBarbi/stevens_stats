"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/** Registers /sw.js in production (kept out of dev so the SW cache doesn't
 *  fight hot-reload), and surfaces a small "reload for the latest version"
 *  banner when a newer service worker takes over an already-open tab. sw.js
 *  calls skipWaiting()/clients.claim() on every install, so a deploy takes
 *  over silently — without this, an installed/long-open tab keeps running
 *  on stale JS while talking to a freshly recached (and possibly
 *  incompatible) set of data files, with no sign anything changed. */
export default function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // A controller already present *before* this page registers means a
    // service worker from an earlier load is running this tab — so that
    // first controllerchange is a genuine update, not just the very first
    // worker ever taking over a fresh install (which also fires one). Once
    // any controller has taken over, every controllerchange after it is a
    // real replacement, so it keeps being true for the rest of the tab's
    // life — covering the rare case of a second deploy in one long session.
    let hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] inset-x-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-card border border-border bg-surface-raised p-3 text-sm shadow-card-hover sm:bottom-4 sm:inset-x-auto sm:right-4"
    >
      <RefreshCw className="h-4 w-4 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-fg">A new version is available.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-brand-fg hover:bg-brand-hover"
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setUpdateReady(false)}
        className="shrink-0 rounded p-0.5 text-fg-subtle hover:text-fg"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
