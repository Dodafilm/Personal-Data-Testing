import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Settings } from '@/lib/types';
import type { Prisma } from '@prisma/client';

// GET /api/health/settings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!row) {
    return NextResponse.json({});
  }

  const settings: Settings = {
    bgEffect: row.bgEffect ?? undefined,
    ...((row.extraSettings as Record<string, unknown>) ?? {}),
  };

  return NextResponse.json(settings);
}

// PATCH /api/health/settings
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const patch: Partial<Settings> = await request.json();

  // Separate known columns from extra settings
  const { bgEffect, ...extra } = patch;

  const data: Prisma.UserSettingsUpdateInput = {};

  if (bgEffect !== undefined) {
    data.bgEffect = bgEffect ?? null;
  }

  // Merge extra settings
  if (Object.keys(extra).length > 0) {
    const existing = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { extraSettings: true },
    });
    const merged = {
      ...((existing?.extraSettings as Record<string, unknown>) ?? {}),
      ...extra,
    };
    data.extraSettings = merged as Prisma.InputJsonValue;
  }

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      bgEffect: (bgEffect as string) ?? 'particles',
      extraSettings: (Object.keys(extra).length > 0 ? extra : {}) as Prisma.InputJsonValue,
    },
    update: data,
  });

  return NextResponse.json({ ok: true });
}
