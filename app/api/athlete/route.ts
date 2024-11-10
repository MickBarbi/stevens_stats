import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Athlete {
  athlete_id: number;
  first_name: string;
  last_name: string;
  year: number;
  graduation_date: number;
  sex: string;
}

export async function GET() {
  try {
    // Fetch athlete data
    const athlete = await prisma.$queryRaw<Athlete[]>
      `SELECT *
      FROM Athletes a
      WHERE a.athlete_id = 8327859`
    ;

    if (!athlete || athlete.length === 0) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    const other_athletes = await prisma.$queryRaw<Athlete[]>
      `SELECT *
      FROM Athletes a
      ORDER BY last_name`
    ;

    if (!other_athletes || other_athletes.length === 0) {
      return NextResponse.json({ error: 'Could not find all_athletes' }, { status: 404 });
    }

    // Combine athlete data with best performances
    const athleteData = {
      ...athlete[0],  // Spread the athlete info
      other_athletes
    };

    return NextResponse.json(athleteData, { status: 200 });  // Send back the athlete data
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    return NextResponse.json({ error: 'An error occurred while fetching athlete data' }, { status: 500 });
  }
}