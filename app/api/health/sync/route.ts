import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { DayRecord } from '@/lib/types';
import type { Prisma } from '@prisma/client';

function toJson(val: unknown): Prisma.InputJsonValue | undefined {
  return val ? (val as Prisma.InputJsonValue) : undefined;
}

// POST /api/health/sync — bulk import localStorage data to cloud
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { records }: { records: DayRecord[] } = await request.json();
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'records array required' }, { status: 400 });
  }

  let synced = 0;
  for (const day of records) {
    if (!day.date) continue;

    // Merge with existing cloud data if any
    const existing = await prisma.healthRecord.findUnique({
      where: { userId_date: { userId: session.user.id, date: day.date } },
    });

    if (existing) {
      // Merge: existing cloud data takes priority, local fills gaps
      await prisma.healthRecord.update({
        where: { userId_date: { userId: session.user.id, date: day.date } },
        data: {
          source: existing.source ?? day.source ?? null,
          sleep: existing.sleep ?? toJson(day.sleep),
          heart: existing.heart ?? toJson(day.heart),
          workout: existing.workout ?? toJson(day.workout),
          stress: existing.stress ?? toJson(day.stress),
        },
      });
    } else {
      await prisma.healthRecord.create({
        data: {
          userId: session.user.id,
          date: day.date,
          source: day.source ?? null,
          sleep: toJson(day.sleep),
          heart: toJson(day.heart),
          workout: toJson(day.workout),
          stress: toJson(day.stress),
        },
      });
    }
    synced++;
  }

  return NextResponse.json({ synced });
}
