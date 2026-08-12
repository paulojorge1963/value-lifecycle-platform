import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no Prisma / bcrypt here, so it can run in middleware.
// The Credentials provider (which needs the DB) is added only in auth.ts.
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Route protection for middleware: everything requires auth except /login.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLogin = nextUrl.pathname.startsWith("/login");
      if (isLogin) return true;
      return isLoggedIn;
    },
    // Carry id / role / org through the JWT into the session.
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id?: string }).id;
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string }).organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { organizationId?: string }).organizationId = token.organizationId as string;
      }
      return session;
    },
  },
};
