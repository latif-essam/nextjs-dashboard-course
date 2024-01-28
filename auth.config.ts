import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    signOut: '/',
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      const isOnDashborad = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashborad) {
        if (isLoggedIn) return true;
      } else if (isLoggedIn)
        return Response.redirect(new URL('/dashboard', nextUrl));

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
