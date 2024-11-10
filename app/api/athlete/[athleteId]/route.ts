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
  nickname: string | null;
  bio: string | null;
  image_path: string | null;
}

interface Bests {
  result_id: number;
  athlete_id: number;
  event_id: number;
  season_best_indoor: number | null;
  season_best_outdoor: number | null;
  overall_best_indoor: number | null;
  overall_best_outdoor: number | null;
  collegiate_best: number | null;
  personal_best: number;
  rank_position_indoor: number | null;
  rank_position_outdoor: number | null;
}

interface Award {
  award: string;
}

export async function GET(request: Request, { params }: { params: { athleteId: string } }) {
  const athleteId = params.athleteId;  // Get athleteId from query params

  if (!athleteId) {
    return NextResponse.json({ error: 'athlete_id is missing' }, { status: 400 });
  }

  try {
    // Fetch athlete data
    const athlete = await prisma.$queryRaw<Athlete[]>
      `SELECT *
      FROM Athletes a
      WHERE a.athlete_id = ${athleteId}`
    ;

    if (!athlete || athlete.length === 0) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Fetch best performances
    const bests = await prisma.$queryRaw<Bests[]>
      `SELECT *
      FROM Bests b
      WHERE b.athlete_id = ${athleteId};`
    ;

    // Fetch college progression
    const college_progression = await prisma.$queryRaw<Performance[]>
      `SELECT *
      FROM Performances
      WHERE athlete_id = ${athleteId}`
    ;

    // Fetch other athletes
    const other_athletes = await prisma.$queryRaw<Athlete[]>
      `SELECT *
      FROM Athletes a
      ORDER BY last_name`
    ;

    if (!other_athletes || other_athletes.length === 0) {
      return NextResponse.json({ error: 'Could not find all_athletes' }, { status: 404 });
    }

    // Fetch awards
    const awards = await prisma.$queryRaw<Award[]>
      `SELECT award
      FROM Awards
      WHERE athlete_id = ${athleteId};`
    ;

    const formattedAwards = awards.map((awardObj: Award) => awardObj.award);

    // Combine athlete data with best performances
    const athleteData = {
      ...athlete[0],  // Spread the athlete info
      bests,          // Add the bests performances data
      college_progression,
      other_athletes,
      awards: formattedAwards
    };

    return NextResponse.json(athleteData, { status: 200 });  // Send back the athlete data
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    return NextResponse.json({ error: 'An error occurred while fetching athlete data' }, { status: 500 });
  }
}
