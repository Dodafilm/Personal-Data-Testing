import { prisma } from '@/lib/prisma';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Returns a valid Google Calendar access token for the given user,
 * refreshing it if expired. Returns null if no token exists or refresh fails.
 */
export async function getValidGcalToken(userId: string): Promise<string | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      gcalAccessToken: true,
      gcalRefreshToken: true,
      gcalTokenExpiry: true,
    },
  });

  if (!settings?.gcalAccessToken) return null;

  // Token still valid — return it
  if (settings.gcalTokenExpiry && settings.gcalTokenExpiry > new Date()) {
    return settings.gcalAccessToken;
  }

  // Token expired — try to refresh
  if (!settings.gcalRefreshToken) return null;

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: settings.gcalRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      console.error('Google Calendar token refresh failed:', await res.text());
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;

    await prisma.userSettings.update({
      where: { userId },
      data: {
        gcalAccessToken: newAccessToken,
        gcalTokenExpiry: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return newAccessToken;
  } catch (err) {
    console.error('Google Calendar token refresh error:', err);
    return null;
  }
}
