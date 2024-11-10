import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
    try {
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

        return NextResponse.json(posts, { status: 200 });
    } catch (error) {
        console.error('Database query error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching posts' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect(); // Close the connection when done
    }
}