import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://api.ouraring.com';

const ENDPOINT_MAP: Record<string, string> = {
  daily_sleep: '/v2/usercollection/daily_sleep',
  sleep_periods: '/v2/usercollection/sleep',
  heartrate: '/v2/usercollection/heartrate',
  daily_activity: '/v2/usercollection/daily_activity',
  daily_stress: '/v2/usercollection/daily_stress',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ endpoint: string }> },
) {
  const { endpoint } = await params;
  const path = ENDPOINT_MAP[endpoint];
  if (!path) {
    return NextResponse.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 404 });
  }

  // Try DB token first (for authenticated users), then cookie fallback
  let token: string | null = null;

  const session = await auth();
  if (session?.user?.id) {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { ouraAccessToken: true, ouraTokenExpiry: true },
    });
    if (settings?.ouraAccessToken) {
      // Check if token is still valid
      if (!settings.ouraTokenExpiry || settings.ouraTokenExpiry > new Date()) {
        token = settings.ouraAccessToken;
      }
    }
  }

  // Fallback to cookie
  if (!token) {
    const cookies = request.headers.get('cookie') || '';
    token = parseCookie(cookies, 'oura_token');
  }

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  // Oura heartrate endpoint uses start_datetime/end_datetime (ISO 8601),
  // while all other endpoints use start_date/end_date (YYYY-MM-DD).
  const useDatetime = endpoint === 'heartrate';

  const apiParams = new URLSearchParams();
  if (startDate) {
    apiParams.set(useDatetime ? 'start_datetime' : 'start_date',
      useDatetime ? `${startDate}T00:00:00+00:00` : startDate);
  }
  if (endDate) {
    apiParams.set(useDatetime ? 'end_datetime' : 'end_date',
      useDatetime ? `${endDate}T23:59:59+00:00` : endDate);
  }

  try {
    // Fetch all pages — Oura API v2 paginates via next_token,
    // especially for heartrate which returns individual samples.
    const allData: unknown[] = [];
    let nextToken: string | null = null;

    do {
      const pageParams = new URLSearchParams(apiParams);
      if (nextToken) pageParams.set('next_token', nextToken);

      const apiUrl = `${BASE_URL}${path}?${pageParams}`;
      const apiRes = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (apiRes.status === 401) {
        return NextResponse.json(
          { error: `Oura returned 401 for ${endpoint}` },
          { status: 401 },
        );
      }

      if (!apiRes.ok) {
        const text = await apiRes.text();
        return NextResponse.json(
          { error: `Oura API error ${apiRes.status}: ${text}` },
          { status: apiRes.status },
        );
      }

      const page = await apiRes.json();
      if (page.data && Array.isArray(page.data)) {
        allData.push(...page.data);
      }
      nextToken = page.next_token || null;
    } while (nextToken);

    return NextResponse.json({ data: allData });
  } catch (err) {
    return NextResponse.json(
      { error: `Proxy error: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
