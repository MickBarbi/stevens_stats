import Link from "next/link";
import { allMeets, sortedPosts } from "@/lib/data";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/site";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import LatestResults from "@/components/LatestResults";
import RecordsStrip from "@/components/RecordsStrip";
import OnThisDay from "@/components/OnThisDay";

// no `title` — the site default title is the strongest for a "Stevens stats" query
export const metadata = pageMetadata({
  description: SITE_DESCRIPTION,
  path: "/home",
});

export default function HomePage() {
  const posts = sortedPosts();
  const meetCount = allMeets().length;

  return (
    <div className="space-y-10">
      {/* quick hits first — each hides itself when it has nothing */}
      <OnThisDay />

      {posts.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Team News</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.post_id}
                href={`/home/${post.post_id}`}
                className="block"
              >
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
        </section>
      )}

      <RecordsStrip />

      <section>
        <PageHeader title="Latest Results" />
        <LatestResults />
        <p className="mt-4 text-sm">
          <Link href="/meet" className="text-link hover:underline">
            Browse all {meetCount} meets →
          </Link>
        </p>
      </section>
    </div>
  );
}
