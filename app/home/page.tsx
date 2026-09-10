import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { sortedPosts } from "@/lib/data";
import { SITE_DESCRIPTION } from "@/lib/site";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LatestResults from "@/components/LatestResults";

export const metadata: Metadata = {
  // uses the site default title (the strongest one for a "Stevens stats" query)
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/home" },
  openGraph: {
    title: "Stevens Stats — Stevens Track & Field Results, Rosters & Records",
    description: SITE_DESCRIPTION,
    url: "/home",
  },
};

export default function HomePage() {
  const posts = sortedPosts();

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Latest Results" />
        <LatestResults />
      </section>

      <section>
        <h2 className="section-title mb-4">Team News</h2>
        {posts.length === 0 ? (
          <EmptyState icon={Newspaper} title="No team news yet">
            Recaps and announcements will land here — check back after the next
            meet.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.post_id} href={`/home/${post.post_id}`} className="block">
                <Card interactive className="h-full p-5">
                  <h3 className="text-lg font-semibold text-fg">{post.title}</h3>
                  <p className="mt-1 text-sm text-fg-muted">{post.subheading}</p>
                  <p className="mt-4 text-xs text-fg-subtle">
                    {new Date(post.created_on).toLocaleDateString()}
                    {post.author ? ` · ${post.author}` : ""}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
