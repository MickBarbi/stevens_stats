import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// The shape returned to the events page: one entry per event, each with a row
// per athlete carrying only the marks that page shows. Built here from flagged
// Performances rows so the client never has to resolve pointers.

type BestCell = {
  mark: string;
  date: Date;
  result_link: string | null;
  ranking: number | null;
} | null;

type Row = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  sex: string | null;
  indoor_best: BestCell;
  outdoor_best: BestCell;
  indoor_season_best: BestCell;
  outdoor_season_best: BestCell;
  collegiate_best: BestCell;
  personal_best: BestCell;
};

export async function GET() {
  try {
    const flagged = await prisma.performances.findMany({
      where: {
        Athletes: { active: true },
        OR: [
          { is_overall_best: true },
          { is_season_best: true },
          { is_collegiate_best: true },
          { is_personal_best: true },
        ],
      },
      include: {
        Athletes: {
          select: {
            athlete_id: true,
            first_name: true,
            last_name: true,
            nickname: true,
            sex: true,
          },
        },
        Events: true,
      },
    });

    const cell = (p: (typeof flagged)[number]): BestCell => ({
      mark: p.mark.toString(),
      date: p.date,
      result_link: p.result_link,
      ranking: p.ranking,
    });

    const events = new Map<
      number,
      { event_id: number; event_name: string; event_season: string; rows: Map<number, Row> }
    >();

    for (const p of flagged) {
      let evt = events.get(p.event_id);
      if (!evt) {
        evt = {
          event_id: p.Events.event_id,
          event_name: p.Events.event_name,
          event_season: p.Events.event_season,
          rows: new Map(),
        };
        events.set(p.event_id, evt);
      }

      let row = evt.rows.get(p.athlete_id);
      if (!row) {
        row = {
          athlete_id: p.Athletes.athlete_id,
          first_name: p.Athletes.first_name,
          last_name: p.Athletes.last_name,
          nickname: p.Athletes.nickname,
          sex: p.Athletes.sex,
          indoor_best: null,
          outdoor_best: null,
          indoor_season_best: null,
          outdoor_season_best: null,
          collegiate_best: null,
          personal_best: null,
        };
        evt.rows.set(p.athlete_id, row);
      }

      const indoor = p.season === 'i';
      if (p.is_overall_best) row[indoor ? 'indoor_best' : 'outdoor_best'] = cell(p);
      if (p.is_season_best) row[indoor ? 'indoor_season_best' : 'outdoor_season_best'] = cell(p);
      if (p.is_collegiate_best) row.collegiate_best = cell(p);
      if (p.is_personal_best) row.personal_best = cell(p);
    }

    const qualifying_standards = await prisma.qualifying_Standards.findMany();

    return NextResponse.json({
      events: Array.from(events.values(), (e) => ({
        event_id: e.event_id,
        event_name: e.event_name,
        event_season: e.event_season,
        rows: Array.from(e.rows.values()),
      })),
      qualifying_standards,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return new NextResponse('Error fetching data', { status: 500 });
  }
}
