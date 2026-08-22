// =============================================================================
//  Session & RBAC.
//
//  The signed-in user comes from Auth.js (NextAuth v5) — see src/lib/auth.ts.
//  getCurrentUser() resolves the session, then loads the full user record so
//  callers keep the same SessionUser shape (incl. title + fresh role).
// =============================================================================

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export type Role =
  | "VALUE_ENGINEER"
  | "VALUE_REALIZATION_MANAGER"
  | "REVIEWER"
  | "VIEWER"
  | "ADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  organizationId: string;
  role: Role;
}

/** Resolve the current user from the Auth.js session. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: true },
  });
  if (!user) return null;
  const membership = user.memberships.find((m) => m.organizationId === user.organizationId) ?? user.memberships[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    organizationId: user.organizationId,
    role: (membership?.role as Role) ?? "VIEWER",
  };
}

// --- Capability model -------------------------------------------------------

export type Capability =
  | "study.create"
  | "study.edit"
  | "study.approve"
  | "study.delete"
  | "recommendation.accept"
  | "track.create"
  | "track.edit"
  | "track.delete"
  | "kpi.record"
  | "report.publish"
  | "team.manage"
  | "view";

const ROLE_CAPS: Record<Role, Capability[]> = {
  ADMIN: [
    "study.create", "study.edit", "study.approve", "study.delete", "recommendation.accept",
    "track.create", "track.edit", "track.delete", "kpi.record", "report.publish", "team.manage", "view",
  ],
  VALUE_ENGINEER: ["study.create", "study.edit", "track.create", "view"],
  VALUE_REALIZATION_MANAGER: ["track.create", "track.edit", "kpi.record", "report.publish", "view"],
  REVIEWER: ["study.approve", "recommendation.accept", "view"],
  VIEWER: ["view"],
};

export function can(role: Role, cap: Capability): boolean {
  return ROLE_CAPS[role]?.includes(cap) ?? false;
}
