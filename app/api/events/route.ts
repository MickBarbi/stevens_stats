import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const result = await prisma.bests.findMany({
      where: {
        Athletes: {
          year: {
            not: -1, // Exclude athletes with year = -1
          },
        },
      },
      include: {
        Athletes: true,
        Events: true,
        Performances_Bests_season_best_indoorToPerformances: true,
        Performances_Bests_season_best_outdoorToPerformances: true,
        Performances_Bests_overall_best_indoorToPerformances: true,
        Performances_Bests_overall_best_outdoorToPerformances: true,
        Performances_Bests_collegiate_bestToPerformances: true,
        Performances_Bests_personal_bestToPerformances: true,
      },
    });
    
    // Now, fetch the qualifying standards based on event_id from the related Events
    const qualifyingStandards = await prisma.qualifying_Standards.findMany();

    // Combine the data by appending qualifyingStandards to the result
    const finalResult = [...result, ...qualifyingStandards];

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error('Error fetching data:', error);
    return new NextResponse('Error fetching data', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
