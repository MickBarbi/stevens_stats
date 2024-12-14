import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

// Instantiate Prisma Client outside of the handler to reuse the connection
const prisma = new PrismaClient();

export async function GET() {
    try {
        const athletes = await prisma.athletes.findMany({
            select: {
                athlete_id: true, // Include id to use it as a key
                first_name: true, // Adjust to your actual column name for names
                last_name: true,
                sex: true,
                year: true,
                image_path: true,
                nickname: true,
            },
            where: { year: { not: -1 } },  // Filter out athletes with year = -1
            orderBy: {
                last_name: 'asc', // Order athletes by last name in ascending order
            },
        });

        // Return athletes data as a JSON response
        return NextResponse.json(athletes, { status: 200});
    } catch (error) {
        console.error('Database query error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching athletes' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect(); // Close the connection when done
    }
}
