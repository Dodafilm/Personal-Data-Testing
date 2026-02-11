import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.ouraring.com';

const ENDPOINT_MAP: Record<string, string> = {
  daily_sleep: '/v2/usercollection/daily_sleep',
  heartrate: '/v2/usercollection/heartrate',
  daily_activity: '/v2/usercollection/daily_activity',
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

  // Read token from httpOnly cookie
  const cookies = request.headers.get('cookie') || '';
  const token = parseCookie(cookies, 'oura_token');
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  const apiParams = new URLSearchParams();
  if (startDate) apiParams.set('start_date', startDate);
  if (endDate) apiParams.set('end_date', endDate);

  const apiUrl = `${BASE_URL}${path}?${apiParams}`;

  try {
    const apiRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (apiRes.status === 401) {
      // Token expired — clear cookie
      const response = NextResponse.json({ error: 'Token expired' }, { status: 401 });
      response.cookies.delete('oura_token');
      return response;
    }

    if (!apiRes.ok) {
      const text = await apiRes.text();
      return NextResponse.json(
        { error: `Oura API error ${apiRes.status}: ${text}` },
        { status: apiRes.status },
      );
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
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
