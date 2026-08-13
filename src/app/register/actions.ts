"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";

/**
 * Create a brand-new workspace (Organization) and its first user as ADMIN,
 * then sign that user in. Multi-tenant: everything the workspace produces is
 * scoped to this organization and isolated from every other.
 */
export async function registerWorkspace(
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const workspace = String(formData.get("workspace") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!workspace || !name || !email || !password) return "All fields are required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirm) return "Passwords don't match.";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "An account with that email already exists.";

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.organization.create({
    data: {
      name: workspace,
      users: {
        create: {
          email,
          name,
          title: "Administrator",
          passwordHash,
        },
      },
    },
  });
  // Link the membership (needs both org + user ids, so do it after create).
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: user.organizationId, role: "ADMIN" },
    });
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/portfolio" });
  } catch (error) {
    if (error instanceof AuthError) return "Account created, but sign-in failed — try signing in.";
    throw error; // NEXT_REDIRECT — let it through
  }
  return undefined;
}
