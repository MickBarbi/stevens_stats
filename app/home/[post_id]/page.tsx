import { PrismaClient } from "@prisma/client";
import './styles.css';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Define the type for the params prop
interface PostPageProps {
  params: {
    post_id: string;
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { post_id } = params;

  // Fetch the post data using Prisma
  const post = await prisma.blog_Posts.findUnique({
    where: { post_id: parseInt(post_id) }, // Parsing post_id to integer
  });

  // If no post found, display a 404 or return null
  if (!post) {
    return <p>Post not found</p>;
  }

  return (
    <div className="post-container">
      <h1>{post.title}</h1>
      {post.subheading && <p>{post.subheading}</p>}
      <p>{new Date(post.created_on).toLocaleDateString()}</p>
      {post.author && <p>By {post.author}</p>}
      <br />
      <p className="post-body">{post.body}</p>
    </div>
  );
}
