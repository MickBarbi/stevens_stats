import Link from "next/link";
import { sortedPosts } from "@/lib/data";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";

export default function HomePage() {
  const posts = sortedPosts();

  return (
    <div>
      <PageHeader title="Team News" />

      {posts.length === 0 ? (
        <p className="text-fg-muted">No posts yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.post_id} href={`/home/${post.post_id}`} className="block">
              <Card interactive className="h-full p-5">
                <h2 className="text-lg font-semibold text-fg">{post.title}</h2>
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
    </div>
  );
}
