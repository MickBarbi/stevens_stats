import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const athletes = await prisma.athletes.findMany({
            select: {
                athlete_id: true,
                first_name: true,
                last_name: true,
                sex: true,
                year: true,
                image_path: true,
                nickname: true,
            },
            where: { active: true },
            orderBy: {
                last_name: 'asc',
            },
        });

        return NextResponse.json(athletes, { status: 200});
    } catch (error) {
        console.error('Database query error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching athletes' },
            { status: 500 }
        );
    }
}
