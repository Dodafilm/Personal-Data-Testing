import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Proxy runs on Node.js runtime (no Edge size limit), so we can use the full auth config
const authHandler = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export function proxy(request: NextRequest) {
  return authHandler(request, {} as never);
}

export const config = {
  matcher: ['/login', '/signup'],
};
