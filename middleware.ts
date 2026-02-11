import { auth } from '@/lib/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
    return Response.redirect(new URL('/', req.url));
  }
});

export const config = {
  // Run middleware on auth pages only — dashboard is accessible without auth
  matcher: ['/login', '/signup'],
};
