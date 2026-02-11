import type { NextAuthConfig } from 'next-auth';

// Lightweight config for middleware — no DB imports
export default {
  providers: [],
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig;
