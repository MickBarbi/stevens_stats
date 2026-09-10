import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import localFont from "next/font/local";
import Navbar from "../components/Navbar";
import BottomTabs from "../components/BottomTabs";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import JsonLd from "../components/JsonLd";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  TEAM_NAME,
  OG_IMAGE,
} from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Stevens Stats",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Mick Barbi" }],
  creator: "Mick Barbi",
  keywords: [
    "Stevens Stats",
    "Stevens track and field",
    "Stevens Institute of Technology track and field",
    "Stevens Ducks track",
    "Stevens cross country stats",
    "college track and field results",
    "MAC track and field",
    "AARTFC",
    "TFRRS",
  ],
  category: "sports",
  manifest: "/manifest.webmanifest",
  // canonical is set per-page (a root relative value resolves to "/" everywhere)
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Stevens Stats",
    statusBarStyle: "black-translucent",
  },
  // <link rel="icon"> (app/icon.svg) and <link rel="apple-touch-icon">
  // (app/apple-icon.png) are emitted by Next's file convention; browsers also
  // fetch /favicon.ico on their own.
};

// Site-wide structured data: identifies the site and the team as entities so
// Google can connect a "Stevens stats" query to this domain.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
      publisher: { "@id": `${SITE_URL}/#team` },
    },
    {
      "@type": "SportsTeam",
      "@id": `${SITE_URL}/#team`,
      name: TEAM_NAME,
      alternateName: ["Stevens Ducks Track & Field", "Stevens Track and Field"],
      sport: "Track and field",
      url: `${SITE_URL}/`,
      memberOf: {
        "@type": "CollegeOrUniversity",
        name: "Stevens Institute of Technology",
        url: "https://www.stevens.edu/",
      },
      subOrganization: {
        "@type": "SportsOrganization",
        name: "Middle Atlantic Conference",
      },
    },
  ],
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
        <JsonLd data={siteJsonLd} />
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
