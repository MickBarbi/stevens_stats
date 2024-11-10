import { PrismaClient } from '@prisma/client';

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
            },
            where: {year: {not: -1}},
            orderBy: {
                last_name: 'asc', // Order athletes by last name in ascending order
            },
        });
        return new Response(JSON.stringify(athletes), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response('Error querying the database: ' + error, {
            status: 500,
        });
    } finally {
        await prisma.$disconnect(); // Close the connection when done
    }
}