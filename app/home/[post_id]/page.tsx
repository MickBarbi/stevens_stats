"use client";

import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import './styles.css';

type Post = {
  author: string;
  title: string;
  created_on: Date;
  subheading: string;
  post_id: number;
  body: string;
}

type Params = Promise<{ post_id: string }>;

interface PageProps {
  params: Params;
}

const PostPage = ({ params }: PageProps) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // No need to await params anymore since it's not a Promise
        const resolvedParams = await params;
        const postId = resolvedParams.post_id;

        const response = await fetch(`/api/home/${postId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setPost(result);
      } catch (error) {
        console.log("Error fetching post data:", error);
        setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params]); // Change dependency to params.postId

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (error){
    return <div>Error: {error.message}</div>
  }

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
      <div className="post-body">{post.body}</div>
    </div>
  );
};

export default PostPage;