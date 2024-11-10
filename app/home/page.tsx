// app/home/page.js
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import './styles.css'

const prisma = new PrismaClient();

interface Post {
  author: string;
  title: string;
  created_on: Date;
  subheading: string;
  post_id: number;
}

export default async function HomePage() {
  // Fetching only the fields we need
  const posts = await prisma.blog_Posts.findMany({
    select: {
      post_id: true,
      title: true,
      created_on: true,
      author: true,
      subheading: true
    },
    orderBy: { created_on: 'desc' },
  });

  return (
    <div className="grid-container">
      {posts.map((post: Post) => (
        <Link href={`/home/${post.post_id}`} key={post.post_id}>
        <div className="post-box">
          <h2>{post.title}</h2>
          <p>{post.subheading}</p>
          <br/>
          <p>{new Date(post.created_on).toLocaleDateString()}</p>
          {post.author && <p>By {post.author}</p>}
          {/*<div>
            <img
              src={post.image_url}
              alt="Post thumbnail"
              style={{ width: '100%', height: 'auto', maxHeight: '150px' }}
            />
          </div>*/}
        </div>
      </Link>
      ))}
    </div>
  )
}
