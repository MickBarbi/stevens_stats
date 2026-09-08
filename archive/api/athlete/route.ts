import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch a specific athlete by ID
    const athlete = await prisma.athletes.findUnique({
      where: { athlete_id: 8327859 },  // Use the specific athlete_id
    });

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Fetch other athletes ordered by last name (limit to avoid large data)
    const other_athletes = await prisma.athletes.findMany({
      where: { active: true },
      orderBy: {
        last_name: 'asc',  // Ensure ascending order of last_name
      },
      take: 100,  // Limit the number of athletes returned (adjust as needed)
    });

    if (!other_athletes || other_athletes.length === 0) {
      return NextResponse.json({ error: 'Could not find all athletes' }, { status: 404 });
    }

    // Combine the athlete data with the other athletes
    const athleteData = {
      ...athlete,  // Spread the specific athlete data
      other_athletes,  // Add the list of other athletes
    };

    return NextResponse.json(athleteData, { status: 200 });  // Send back the combined data
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    return NextResponse.json({ error: 'An error occurred while fetching athlete data' }, { status: 500 });
  }
}
