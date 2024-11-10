// app/home/page.js
'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import './styles.css'

interface Post {
  author: string;
  title: string;
  created_on: Date;
  subheading: string;
  post_id: number;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/home");
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    };

    fetchPosts();
  }, []);



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
