"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { addTeamMember, changeMemberRole, removeTeamMember, resetMemberPassword } from "@/app/settings/team/actions";

interface Member {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: string;
  self: boolean;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "VALUE_ENGINEER", label: "Value Engineer" },
  { value: "VALUE_REALIZATION_MANAGER", label: "Value Realization Manager" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "VIEWER", label: "Viewer / Stakeholder" },
  { value: "ADMIN", label: "Administrator" },
];

export function TeamManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [addError, addAction, adding] = useActionState(addTeamMember, undefined);
  const [pending, start] = useTransition();
  const [rowErr, setRowErr] = useState<{ id: string; msg: string } | null>(null);
  const [pwFor, setPwFor] = useState<string | null>(null);

  function setRole(userId: string, role: string) {
    start(async () => {
      setRowErr(null);
      try {
        await changeMemberRole(userId, role);
        router.refresh();
      } catch (e) {
        setRowErr({ id: userId, msg: e instanceof Error ? e.message : "Failed" });
      }
    });
  }
  function remove(userId: string) {
    if (!confirm("Remove this member from the workspace? They will lose access.")) return;
    start(async () => {
      setRowErr(null);
      try {
        await removeTeamMember(userId);
        router.refresh();
      } catch (e) {
        setRowErr({ id: userId, msg: e instanceof Error ? e.message : "Failed" });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Add member */}
      <div className="card card-pad">
        <h2 className="mb-3 font-semibold text-ink-900">Add a teammate</h2>
        <form action={addAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input mt-1" placeholder="Full name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input mt-1" placeholder="person@company.com" />
          </div>
          <div>
            <label className="label">Title (optional)</label>
            <input name="title" className="input mt-1" placeholder="e.g. Senior Value Engineer" />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" defaultValue="VALUE_ENGINEER" className="input mt-1">
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Initial password</label>
            <input name="password" type="text" required minLength={8} className="input mt-1" placeholder="min 8 chars — share with them" />
            <p className="mt-1 text-xs text-ink-400">They sign in with this; they can be given a new one anytime below.</p>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={adding} className="btn-ve w-full justify-center sm:w-auto">
              {adding ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* Members */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-ink-200 bg-ink-50">
            <tr>
              <th className="th">Member</th>
              <th className="th">Role</th>
              <th className="th text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {members.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="td">
                  <div className="font-medium text-ink-900">{m.name}{m.self && <span className="ml-2 text-xs text-ink-400">(you)</span>}</div>
                  <div className="text-xs text-ink-400">{m.email}{m.title ? ` · ${m.title}` : ""}</div>
                </td>
                <td className="td">
                  <select
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => setRole(m.id, e.target.value)}
                    className="rounded-lg border border-ink-300 px-2 py-1.5 text-sm"
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="td">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex gap-1.5">
                      <button
                        className="btn border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100"
                        onClick={() => setPwFor(pwFor === m.id ? null : m.id)}
                      >
                        Set password
                      </button>
                      {!m.self && (
                        <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(m.id)}>
                          Remove
                        </button>
                      )}
                    </div>
                    {pwFor === m.id && <ResetPassword userId={m.id} onDone={() => { setPwFor(null); router.refresh(); }} />}
                    {rowErr?.id === m.id && <p className="max-w-xs text-right text-xs text-red-600">{rowErr.msg}</p>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResetPassword({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [err, action, pending] = useActionState(
    async (_p: string | undefined, fd: FormData) => {
      const res = await resetMemberPassword(_p, fd);
      if (!res) onDone();
      return res;
    },
    undefined
  );
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <input name="password" type="text" required minLength={8} placeholder="new password" className="w-40 rounded border border-ink-300 px-2 py-1 text-xs" />
      <button className="btn bg-ve-600 px-2.5 py-1 text-xs text-white hover:bg-ve-700" disabled={pending}>{pending ? "…" : "Save"}</button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </form>
  );
}
