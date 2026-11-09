"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { changeOwnPassword, type ChangePasswordState } from "@/lib/account-actions";

/**
 * Shared "change your password" form. Used by the voluntary account page and by
 * the forced-change screen (ForcedPasswordChange). `currentLabel` lets the
 * forced screen say "Temporary password" instead of "Current password".
 * On success we refresh so the server re-reads `mustChangePassword` and the
 * layout drops the forced-change gate.
 */
export function PasswordChangeForm({
  currentLabel = "Current password",
  submitLabel = "Update password",
  onDone,
}: {
  currentLabel?: string;
  submitLabel?: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<ChangePasswordState | undefined, FormData>(
    changeOwnPassword,
    undefined,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone?.();
    }
  }, [state?.ok, router, onDone]);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">{currentLabel}</label>
        <input name="current" type="password" required autoComplete="current-password" className="input mt-1" />
      </div>
      <div>
        <label className="label">New password</label>
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className="input mt-1" placeholder="At least 8 characters" />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input mt-1" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Password updated.</p>}
      <button type="submit" disabled={pending} className="btn-ve w-full justify-center">
        {pending ? "Updating…" : submitLabel}
      </button>
    </form>
  );
}
