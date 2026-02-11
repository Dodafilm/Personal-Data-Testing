import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';

// Use lightweight config — no Prisma/bcrypt imports to stay under Edge 1MB limit
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
    return Response.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/login', '/signup'],
};
