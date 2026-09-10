import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { allMeets, athletes, blogPosts, performances } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // last time each athlete's page would have changed = their most recent mark
  const lastMark = new Map<number, string>();
  for (const p of performances) {
    const cur = lastMark.get(p.athlete_id);
    if (!cur || p.date > cur) lastMark.set(p.athlete_id, p.date);
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/home`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/roster`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/meet`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/records`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/athlete`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const meetRoutes: MetadataRoute.Sitemap = allMeets().map((m) => ({
    url: `${SITE_URL}/meet/${m.slug}`,
    lastModified: new Date(`${m.date}T00:00:00Z`),
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  const athleteRoutes: MetadataRoute.Sitemap = athletes.map((a) => {
    const d = lastMark.get(a.athlete_id);
    return {
      url: `${SITE_URL}/athlete/${a.athlete_id}`,
      lastModified: d ? new Date(`${d}T00:00:00Z`) : now,
      changeFrequency: a.active ? "weekly" : "yearly",
      priority: a.active ? 0.7 : 0.4,
    };
  });

  const postRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${SITE_URL}/home/${p.post_id}`,
    lastModified: new Date(p.created_on),
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...meetRoutes, ...athleteRoutes, ...postRoutes];
}
