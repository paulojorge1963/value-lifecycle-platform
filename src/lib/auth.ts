import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

// Full config (Node runtime): adds the Credentials provider which needs Prisma + bcrypt.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email || "").toLowerCase().trim();
        const password = String(creds?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: true },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const membership =
          user.memberships.find((m) => m.organizationId === user.organizationId) ?? user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership?.role ?? "VIEWER",
          organizationId: user.organizationId,
        };
      },
    }),
  ],
});
