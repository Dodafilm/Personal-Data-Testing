import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${url.origin}?gcal_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${url.origin}?gcal_error=no_code`);
  }

  // Verify state
  const cookies = request.headers.get('cookie') || '';
  const stateCookie = parseCookie(cookies, 'gcal_oauth_state');
  if (stateCookie && state !== stateCookie) {
    return NextResponse.redirect(`${url.origin}?gcal_error=state_mismatch`);
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}?gcal_error=server_config`);
  }

  // Only authenticated users can connect Google Calendar
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${url.origin}?gcal_error=not_authenticated`);
  }

  const redirectUri = `${url.origin}/api/gcal/callback`;

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Google Calendar token exchange failed:', text);
      return NextResponse.redirect(`${url.origin}?gcal_error=token_exchange`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string) ?? null;
    const expiresIn = (tokenData.expires_in as number) || 3600;

    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        gcalAccessToken: accessToken,
        gcalRefreshToken: refreshToken,
        gcalTokenExpiry: new Date(Date.now() + expiresIn * 1000),
      },
      update: {
        gcalAccessToken: accessToken,
        gcalRefreshToken: refreshToken,
        gcalTokenExpiry: new Date(Date.now() + expiresIn * 1000),
      },
    });

    const response = NextResponse.redirect(`${url.origin}?gcal_connected=true`);
    response.cookies.delete('gcal_oauth_state');
    return response;
  } catch (err) {
    console.error('Google Calendar OAuth callback error:', err);
    return NextResponse.redirect(`${url.origin}?gcal_error=server_error`);
  }
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
