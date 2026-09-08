import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = Promise<{ athleteId: string }>;

export async function GET(
  request: Request,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const athleteId = Number(params.athleteId);

    if (!params.athleteId) {
      return NextResponse.json({ error: 'athlete_id is missing' }, { status: 400 });
    }
    if (isNaN(athleteId)) {
      return NextResponse.json(
        { error: 'athlete_id should be a valid number' },
        { status: 400 }
      );
    }

    const athlete = await prisma.athletes.findUnique({
      where: { athlete_id: athleteId },
    });

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Every result this athlete has recorded. The career-best table and the
    // progression charts are both derived from this one list on the client -
    // the "best" rows are just the ones with an is_*_best flag set.
    const college_progression = await prisma.performances.findMany({
      where: { athlete_id: athleteId },
      orderBy: { date: 'asc' },
      include: { Events: { select: { event_name: true } } },
    });

    const other_athletes = await prisma.athletes.findMany({
      where: { active: true },
      orderBy: { last_name: 'asc' },
      select: {
        athlete_id: true,
        first_name: true,
        last_name: true,
        nickname: true,
      },
    });

    const awards = await prisma.awards.findMany({
      where: { athlete_id: athleteId },
      select: { award: true },
    });

    const athleteData = {
      ...athlete,
      college_progression,
      other_athletes,
      awards: awards.map((a) => a.award),
    };

    return NextResponse.json(athleteData, { status: 200 });
  } catch (error) {
    console.error('Error fetching athlete data:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
