"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export type ChangePasswordState = { ok?: true; error?: string };

/**
 * Let the signed-in user change their own password.
 *
 * Works for both flows:
 *  - Voluntary change from the account page.
 *  - The forced "set your password" screen shown when `mustChangePassword` is
 *    true (an admin created or reset the account). "Current password" there is
 *    the temporary password the admin handed over.
 *
 * Verifying the current password means a walk-away/hijacked session can't
 * silently swap the password. On success the `mustChangePassword` flag is
 * cleared, which immediately lifts the forced-change screen on the next render.
 */
export async function changeOwnPassword(
  _prev: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has expired — sign in again." };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!current || !next) return { error: "Fill in every field." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };
  if (next === current) return { error: "Choose a password different from your current one." };

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!record?.passwordHash) return { error: "This account can't change its password here." };

  const ok = await bcrypt.compare(current, record.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false },
  });
  await prisma.auditEvent.create({
    data: { actorId: user.id, action: "account.password_changed", entityType: "User", entityId: user.id },
  });

  // Re-render the layout (lifts the forced-change gate) and the account page.
  revalidatePath("/", "layout");
  return { ok: true };
}
