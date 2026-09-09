import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import localFont from "next/font/local";
import Navbar from "../components/Navbar";
import BottomTabs from "../components/BottomTabs";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

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

// Absolute base for OG / Twitter image URLs. Set NEXT_PUBLIC_SITE_URL in the
// deploy env for a custom domain; otherwise Vercel's production URL is used.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Stevens Stats",
  description:
    "Track & field results for the Stevens team — rosters, event bests and season progressions.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Stevens Stats",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#992211",
  // let the page fill the display so env(safe-area-inset-*) resolves in the
  // installed (standalone) app — needed to keep the bottom tabs off the iOS
  // home indicator and the header out from under the status bar.
  viewportFit: "cover",
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
          className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pt-8 sm:pb-8"
        >
          {children}
        </main>
        <BottomTabs />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
