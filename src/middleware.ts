import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Middleware runs the edge-safe config only (no Prisma/bcrypt). The `authorized`
// callback redirects unauthenticated requests to /login.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except NextAuth's own endpoints and Next.js internals
  // (static assets, image optimizer, HMR websocket, RSC fetches).
  matcher: ["/((?!api/auth|_next|favicon.ico).*)"],
};
