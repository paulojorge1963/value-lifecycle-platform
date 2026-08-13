"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";

const ROLES = ["VALUE_ENGINEER", "VALUE_REALIZATION_MANAGER", "REVIEWER", "VIEWER", "ADMIN"] as const;
type RoleName = (typeof ROLES)[number];

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "team.manage")) throw new Error("Only an administrator can manage the team.");
  return user;
}

async function adminCount(orgId: string) {
  return prisma.membership.count({ where: { organizationId: orgId, role: "ADMIN" } });
}

/** Add a teammate to the admin's workspace with a role and an initial password. */
export async function addTeamMember(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const role = String(formData.get("role") || "VIEWER") as RoleName;
  const title = String(formData.get("title") || "").trim() || null;
  const password = String(formData.get("password") || "");

  if (!name || !email) return "Name and email are required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (!ROLES.includes(role)) return "Pick a valid role.";
  if (password.length < 8) return "Initial password must be at least 8 characters.";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "An account with that email already exists.";

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, title, organizationId: admin.organizationId, passwordHash },
  });
  await prisma.membership.create({
    data: { userId: user.id, organizationId: admin.organizationId, role: role as never },
  });
  await prisma.auditEvent.create({
    data: { actorId: admin.id, action: "team.member_added", entityType: "User", entityId: user.id, metadata: { role } },
  });
  revalidatePath("/settings/team");
  return undefined;
}

/** Change a member's role. Guards against removing the last administrator. */
export async function changeMemberRole(userId: string, role: string) {
  const admin = await requireAdmin();
  if (!ROLES.includes(role as RoleName)) throw new Error("Invalid role.");
  const membership = await prisma.membership.findFirst({ where: { userId, organizationId: admin.organizationId } });
  if (!membership) throw new Error("Member not found in this workspace.");
  if (membership.role === "ADMIN" && role !== "ADMIN" && (await adminCount(admin.organizationId)) <= 1) {
    throw new Error("You can't remove the last administrator's role. Promote someone else to Admin first.");
  }
  await prisma.membership.update({ where: { id: membership.id }, data: { role: role as never } });
  await prisma.auditEvent.create({
    data: { actorId: admin.id, action: "team.role_changed", entityType: "User", entityId: userId, metadata: { role } },
  });
  revalidatePath("/settings/team");
}

/** Reset a member's password to a new value the admin sets. */
export async function resetMemberPassword(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const password = String(formData.get("password") || "");
  if (password.length < 8) return "New password must be at least 8 characters.";
  const membership = await prisma.membership.findFirst({ where: { userId, organizationId: admin.organizationId } });
  if (!membership) return "Member not found in this workspace.";
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await prisma.auditEvent.create({
    data: { actorId: admin.id, action: "team.password_reset", entityType: "User", entityId: userId },
  });
  revalidatePath("/settings/team");
  return undefined;
}

/**
 * Remove a member from the workspace. Guards: not you, not the last admin.
 * If the member owns studies/tracks or authored comments, `reassignToId` (another
 * member of the workspace) must be given — that work is reassigned before removal.
 */
export async function removeTeamMember(userId: string, reassignToId?: string | null) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You can't remove yourself.");
  const membership = await prisma.membership.findFirst({ where: { userId, organizationId: admin.organizationId } });
  if (!membership) throw new Error("Member not found in this workspace.");
  if (membership.role === "ADMIN" && (await adminCount(admin.organizationId)) <= 1) {
    throw new Error("That's the last administrator — promote someone else first.");
  }

  const [studies, tracks, comments] = await Promise.all([
    prisma.study.count({ where: { ownerId: userId } }),
    prisma.realizationTrack.count({ where: { ownerId: userId } }),
    prisma.comment.count({ where: { authorId: userId } }),
  ]);
  const ownsWork = studies || tracks || comments;

  if (ownsWork) {
    if (!reassignToId) {
      throw new Error(`This person owns ${studies} studies, ${tracks} tracks and ${comments} comments — choose a member to reassign that work to.`);
    }
    if (reassignToId === userId) throw new Error("Reassign the work to a different member.");
    const target = await prisma.membership.findFirst({ where: { userId: reassignToId, organizationId: admin.organizationId } });
    if (!target) throw new Error("Reassignment target must be a member of this workspace.");

    await prisma.$transaction([
      prisma.study.updateMany({ where: { ownerId: userId, organizationId: admin.organizationId }, data: { ownerId: reassignToId } }),
      prisma.realizationTrack.updateMany({ where: { ownerId: userId, organizationId: admin.organizationId }, data: { ownerId: reassignToId } }),
      prisma.comment.updateMany({ where: { authorId: userId }, data: { authorId: reassignToId } }),
    ]);
  }

  await prisma.user.delete({ where: { id: userId } }); // memberships cascade; optional refs set null
  await prisma.auditEvent.create({
    data: {
      actorId: admin.id,
      action: "team.member_removed",
      entityType: "User",
      entityId: userId,
      metadata: ownsWork ? { reassignedTo: reassignToId, studies, tracks, comments } : undefined,
    },
  });
  revalidatePath("/settings/team");
}
