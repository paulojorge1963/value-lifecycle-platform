"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerWorkspace } from "@/app/register/actions";

export function RegisterForm() {
  const [error, action, pending] = useActionState(registerWorkspace, undefined);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">Workspace name</label>
        <input name="workspace" required placeholder="e.g. Acme Value Advisory" className="input mt-1" />
        <p className="mt-1 text-xs text-ink-400">Your organization. You&apos;ll be its administrator and can add teammates.</p>
      </div>
      <div>
        <label className="label">Your name</label>
        <input name="name" required placeholder="Full name" className="input mt-1" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required placeholder="you@company.com" className="input mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" required minLength={8} className="input mt-1" />
        </div>
        <div>
          <label className="label">Confirm</label>
          <input name="confirm" type="password" required minLength={8} className="input mt-1" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-ve w-full justify-center">
        {pending ? "Creating workspace…" : "Create workspace"}
      </button>
      <p className="pt-1 text-center text-sm text-ink-500">
        Already have an account? <Link href="/login" className="font-medium text-ve-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
