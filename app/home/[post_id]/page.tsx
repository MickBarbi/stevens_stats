import { notFound } from "next/navigation";
import { blogPosts, getPost } from "@/lib/data";
import Card from "@/components/ui/Card";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ post_id: String(p.post_id) }));
}

export const dynamicParams = false;

export default async function PostPage({
  params,
}: {
  params: Promise<{ post_id: string }>;
}) {
  const { post_id } = await params;
  const post = getPost(Number(post_id));
  if (!post) notFound();

  return (
    <Card as="article" className="mx-auto max-w-3xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-fg">{post.title}</h1>
      {post.subheading && <p className="mt-2 text-lg text-fg-muted">{post.subheading}</p>}
      <p className="mt-3 text-sm text-fg-subtle">
        {new Date(post.created_on).toLocaleDateString()}
        {post.author ? ` · ${post.author}` : ""}
      </p>
      <div className="mt-6 whitespace-pre-line text-[1.05rem] leading-8 text-fg">
        {post.body}
      </div>
    </Card>
  );
}
