import Link from "next/link";
import { sortedPosts } from "@/lib/data";
import "./styles.css";

export default function HomePage() {
  const posts = sortedPosts();

  if (posts.length === 0) {
    return <p style={{ padding: "1.5rem" }}>No posts yet.</p>;
  }

  return (
    <div className="grid-container">
      {posts.map((post) => (
        <Link href={`/home/${post.post_id}`} key={post.post_id}>
          <div className="post-box">
            <h2>{post.title}</h2>
            <p>{post.subheading}</p>
            <br />
            <p>{new Date(post.created_on).toLocaleDateString()}</p>
            {post.author && <p>By {post.author}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
