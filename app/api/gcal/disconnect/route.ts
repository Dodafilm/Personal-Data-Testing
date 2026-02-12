import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await prisma.userSettings.update({
      where: { userId: session.user.id },
      data: {
        gcalAccessToken: null,
        gcalRefreshToken: null,
        gcalTokenExpiry: null,
        gcalCalendarIds: [],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Google Calendar disconnect error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
