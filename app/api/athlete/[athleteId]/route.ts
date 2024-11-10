import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Award {
  award: string;
}

type Params = Promise<{ athleteId: string }>;

export async function GET(
  request: Request,
  segmentData: { params: Params }
) {
  try {
    // Await the params
    const params = await segmentData.params;
    const athleteId = params.athleteId;
  
    if (!athleteId) {
      return NextResponse.json({ error: 'athlete_id is missing' }, { status: 400 });
    }

    // Validate that postId is a number
    const athleteIdNumber = Number(athleteId);
    if (isNaN(athleteIdNumber)) {
      return NextResponse.json(
        { error: "athlete_id should be a valid number" },
        { status: 400 }
      );
    }

    // Query for the specific athlete
    const athlete = await prisma.athletes.findUnique({
      where: { athlete_id: Number(athleteId) },
    });

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    const bests = await prisma.bests.findMany({
      where: { athlete_id: Number(athleteId) },
    });

    const college_progression = await prisma.performances.findMany({
      where: { athlete_id: Number(athleteId) },
    });

    const other_athletes = await prisma.athletes.findMany({
      orderBy: { last_name: 'asc' },
      where: { year: { not: -1 } },
    });

    if (!other_athletes || other_athletes.length === 0) {
      return NextResponse.json({ error: 'Could not find all athletes' }, { status: 404 });
    }

    const awards = await prisma.awards.findMany({
      where: { athlete_id: Number(athleteId) },
      select: { award: true },
    });

    const formattedAwards = awards.map((awardObj: Award) => awardObj.award);

    // Combine athlete data with best performances
    const athleteData = {
      ...athlete,
      bests,
      college_progression,
      other_athletes,
      awards: formattedAwards,
    };

    return NextResponse.json(athleteData, { status: 200 });
  } catch (error) {
    //Log detailed error for debugging
    console.error('Error fetching athlete data:', error);
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
    await prisma.$disconnect();
  }
}
