"use client";

import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import './styles.css';

interface Post {
  author: string;
  title: string;
  created_on: Date;
  subheading: string;
  post_id: number;
  body: string;
}

type Params = Promise<{ postId: string }>;

interface PageProps {
  params: Params;
}

export default function PostPage({ params }: PageProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const resolvedParams = await params;
        const postId = resolvedParams.postId;

        const response = await fetch(`/api/home/${postId}`);
        if (!response.ok){
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error("Error fetching post:", error);
        setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params]);

  if (loading){
    return <div>Loading...</div>
  }

  if (error){
    return <div>Error: {error.message}</div>
  }

  // If no post found, display a 404 or return null
  if (!post) {
    notFound();
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
