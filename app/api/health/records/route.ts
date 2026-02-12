import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { DayRecord } from '@/lib/types';
import type { Prisma } from '@prisma/client';

function toJson(val: unknown): Prisma.InputJsonValue | undefined {
  return val ? (val as Prisma.InputJsonValue) : undefined;
}

// GET /api/health/records?start=YYYY-MM-DD&end=YYYY-MM-DD
// GET /api/health/records?dates_only=true
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const datesOnly = url.searchParams.get('dates_only') === 'true';

  if (datesOnly) {
    const records = await prisma.healthRecord.findMany({
      where: { userId: session.user.id },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(records.map(r => r.date));
  }

  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  const where: { userId: string; date?: { gte?: string; lte?: string } } = {
    userId: session.user.id,
  };
  if (start || end) {
    where.date = {};
    if (start) where.date.gte = start;
    if (end) where.date.lte = end;
  }

  const records = await prisma.healthRecord.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  const days: DayRecord[] = records.map(r => ({
    date: r.date,
    source: r.source ?? undefined,
    sleep: r.sleep as unknown as DayRecord['sleep'],
    heart: r.heart as unknown as DayRecord['heart'],
    workout: r.workout as unknown as DayRecord['workout'],
    stress: r.stress as unknown as DayRecord['stress'],
  }));

  return NextResponse.json(days);
}

// Merge incoming data with existing record so we never overwrite
// one category's data when saving another.
async function mergedUpsert(userId: string, day: DayRecord) {
  const existing = await prisma.healthRecord.findUnique({
    where: { userId_date: { userId, date: day.date } },
  });

  const merged = {
    sleep: toJson(day.sleep) ?? (existing?.sleep as Prisma.InputJsonValue) ?? undefined,
    heart: toJson(day.heart) ?? (existing?.heart as Prisma.InputJsonValue) ?? undefined,
    workout: toJson(day.workout) ?? (existing?.workout as Prisma.InputJsonValue) ?? undefined,
    stress: toJson(day.stress) ?? (existing?.stress as Prisma.InputJsonValue) ?? undefined,
  };

  await prisma.healthRecord.upsert({
    where: { userId_date: { userId, date: day.date } },
    create: {
      userId,
      date: day.date,
      source: day.source ?? null,
      sleep: merged.sleep,
      heart: merged.heart,
      workout: merged.workout,
      stress: merged.stress,
    },
    update: {
      source: day.source ?? undefined,
      sleep: merged.sleep,
      heart: merged.heart,
      workout: merged.workout,
      stress: merged.stress,
    },
  });
}

// POST /api/health/records — upsert a single day
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day: DayRecord = await request.json();
  if (!day.date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  await mergedUpsert(session.user.id, day);

  return NextResponse.json({ ok: true });
}

// PUT /api/health/records — bulk upsert
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { records }: { records: DayRecord[] } = await request.json();
  if (!Array.isArray(records)) {
    return NextResponse.json({ error: 'records array required' }, { status: 400 });
  }

  let count = 0;
  for (const day of records) {
    if (!day.date) continue;
    await mergedUpsert(session.user.id, day);
    count++;
  }

  return NextResponse.json({ ok: true, count });
}

// DELETE /api/health/records — clear all user data
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count } = await prisma.healthRecord.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
