import Link from "next/link";
import { sortedPosts } from "@/lib/data";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import LatestResults from "@/components/LatestResults";

export default function HomePage() {
  const posts = sortedPosts();

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Latest Results" />
        <LatestResults />
      </section>

      {posts.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Team News</h2>
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
        </section>
      )}
    </div>
  );
}
