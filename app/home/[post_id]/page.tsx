import { notFound } from "next/navigation";
import { blogPosts, getPost } from "@/lib/data";
import "./styles.css";

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
    <div className="post-container">
      <h1>{post.title}</h1>
      {post.subheading && <p>{post.subheading}</p>}
      <p>{new Date(post.created_on).toLocaleDateString()}</p>
      {post.author && <p>By {post.author}</p>}
      <br />
      <div className="post-body">{post.body}</div>
    </div>
  );
}
