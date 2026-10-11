import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next 16 renamed the "middleware" file convention to "proxy". This runs the
// edge-safe auth config only (no Prisma/bcrypt); the `authorized` callback in
// authConfig redirects unauthenticated requests to /login.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Everything except NextAuth's own endpoints and Next internals
  // (static assets, image optimizer, HMR websocket, RSC fetches).
  matcher: ["/((?!api/auth|_next|favicon.ico).*)"],
};
