import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Change the type to match Next.js route parameters
interface RouteParams {
  params: {
    postId: string;
  }
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { postId } = await params;
    console.log('PostId in API:', postId);

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

    console.log('Found post:', post);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.error('Error querying the database:', error);
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
  } finally {
    await prisma.$disconnect();
  }
}