import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import localFont from "next/font/local";
import Navbar from "../components/Navbar";
import BottomTabs from "../components/BottomTabs";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stevens Stats",
  description:
    "Track & field results for the Stevens team — rosters, event bests and season progressions.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
    other: { rel: "apple-touch-icon-precomposed", url: "/favicon.ico" },
  },
};

// Runs before first paint so the saved theme is applied with no flash.
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||((!s||s==='system')&&m);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-[70] rounded-md bg-brand px-4 py-2 text-brand-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
        >
          Skip to content
        </a>
        <Navbar />
        <main
          id="main"
          className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:pt-8 sm:pb-8"
        >
          {children}
        </main>
        <BottomTabs />
      </body>
    </html>
  );
}
