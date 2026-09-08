import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = Promise<{ postId: string }>;

export async function GET(
  request: Request,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const postId = params.postId;

    if (!postId) {
      return NextResponse.json({ error: 'postId is missing' }, { status: 400 });
    }

    // Validate that postId is a number
    const postIdNumber = Number(postId);
    if (isNaN(postIdNumber)) {
      return NextResponse.json(
        { error: "post_id should be a valid number" },
        { status: 400 }
      );
    }

    // Query for the specific blog post
    const post = await prisma.blog_Posts.findUnique({
      where: { post_id: postIdNumber },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.error('Error fetching post data:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
