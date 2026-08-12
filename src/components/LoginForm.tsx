"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/login/actions";

const DEMO_PASSWORD = "demo1234";
const DEMO_USERS = [
  { email: "ve@demo.app", name: "Dana Okafor", role: "Value Engineer" },
  { email: "vrm@demo.app", name: "Marco Ruiz", role: "Value Realization Manager" },
  { email: "reviewer@demo.app", name: "Priya Nair", role: "Reviewer" },
  { email: "viewer@demo.app", name: "Sam Lee", role: "Stakeholder / Viewer" },
  { email: "admin@demo.app", name: "Admin", role: "Administrator" },
];

export function LoginForm() {
  const [error, action, pending] = useActionState(authenticate, undefined);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required defaultValue="ve@demo.app" className="input mt-1" />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" required defaultValue={DEMO_PASSWORD} className="input mt-1" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="btn-ve w-full justify-center">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-ink-400">or sign in as a demo role</span></div>
      </div>

      <div className="grid gap-2">
        {DEMO_USERS.map((u) => (
          <form key={u.email} action={action}>
            <input type="hidden" name="email" value={u.email} />
            <input type="hidden" name="password" value={DEMO_PASSWORD} />
            <button type="submit" disabled={pending} className="flex w-full items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-left text-sm hover:bg-ink-50">
              <span className="font-medium text-ink-900">{u.name}</span>
              <span className="text-xs text-ink-500">{u.role}</span>
            </button>
          </form>
        ))}
      </div>

      <p className="text-center text-xs text-ink-400">Demo password: <code className="rounded bg-ink-100 px-1">{DEMO_PASSWORD}</code></p>
    </div>
  );
}
