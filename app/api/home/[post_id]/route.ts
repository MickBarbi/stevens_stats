import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Initialize Prisma Client
const prisma = new PrismaClient();

type Params = Promise<{ postId: string }>;

export async function GET(
  req: NextRequest, 
  { params }: { params: Params }  // Destructure params directly
) {
  try {
    // Await the params
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    // Check if postId exists
    if (!postId) {
      return NextResponse.json({ error: "post_id is missing" }, { status: 400 });
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
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    // Log detailed error for debugging
    console.error("Error querying the database:", error);
    
    // More detailed error handling
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
    await prisma.$disconnect(); // Close the connection when done
  }
}