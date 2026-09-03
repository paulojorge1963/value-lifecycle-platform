"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { authenticate } from "@/app/login/actions";

type Member = { name: string; email: string; role: string };
type Workspace = { id: string; name: string; isDemo: boolean; members: Member[] };

export function LoginForm({
  workspaces,
  demoPassword,
}: {
  workspaces: Workspace[];
  demoPassword?: string | null;
}) {
  // One-click demo sign-in is only offered when the demo password is available
  // (DEMO_PASSWORD is set). Otherwise the demo workspace behaves like any other:
  // pick a member to prefill the email, then type the password.
  const oneClickDemo = Boolean(demoPassword);
  const [error, action, pending] = useActionState(authenticate, undefined);

  // Default to the demo workspace if present, else the first one.
  const initial = workspaces.find((w) => w.isDemo) ?? workspaces[0];
  const [wsId, setWsId] = useState(initial?.id ?? "");
  const ws = workspaces.find((w) => w.id === wsId) ?? initial;

  // Controlled email so picking a member can fill it in.
  const [email, setEmail] = useState(initial?.isDemo ? (initial.members[0]?.email ?? "") : "");
  const pwRef = useRef<HTMLInputElement>(null);

  function pickMember(m: Member) {
    setEmail(m.email);
    pwRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="label">Password</label>
          <input ref={pwRef} name="password" type="password" required className="input mt-1" placeholder="Your password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="btn-ve w-full justify-center">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {workspaces.length > 0 && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ink-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-ink-400">or pick a workspace member</span></div>
          </div>

          <div>
            <label className="label">Workspace</label>
            <select value={wsId} onChange={(e) => setWsId(e.target.value)} className="input mt-1">
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}{w.isDemo ? " · demo" : ""}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            {ws?.members.map((m) =>
              ws.isDemo && oneClickDemo ? (
                // demo workspace: one-click sign-in with the shared demo password
                <form key={m.email} action={action}>
                  <input type="hidden" name="email" value={m.email} />
                  <input type="hidden" name="password" value={demoPassword ?? ""} />
                  <button type="submit" disabled={pending} className="flex w-full items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-left text-sm hover:bg-ink-50">
                    <span className="font-medium text-ink-900">{m.name}</span>
                    <span className="text-xs text-ink-500">{m.role}</span>
                  </button>
                </form>
              ) : (
                // real workspace: fill the email, they enter their own password
                <button
                  key={m.email}
                  type="button"
                  disabled={pending}
                  onClick={() => pickMember(m)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-ink-50 ${email === m.email ? "border-ve-400 bg-ve-50" : "border-ink-200"}`}
                >
                  <span className="font-medium text-ink-900">{m.name}</span>
                  <span className="text-xs text-ink-500">{m.role}</span>
                </button>
              )
            )}
            {ws && ws.members.length === 0 && (
              <p className="text-center text-xs text-ink-400">No members in this workspace yet.</p>
            )}
          </div>

          {ws?.isDemo && oneClickDemo ? (
            <p className="text-center text-xs text-ink-400">Demo password: <code className="rounded bg-ink-100 px-1">{demoPassword}</code></p>
          ) : (
            <p className="text-center text-xs text-ink-400">Pick a member to fill their email, then enter your password above.</p>
          )}
        </>
      )}

      <div className="border-t border-ink-100 pt-4 text-center text-sm text-ink-500">
        New to the platform? <Link href="/register" className="font-medium text-ve-700 hover:underline">Create a workspace</Link>
      </div>
    </div>
  );
}
