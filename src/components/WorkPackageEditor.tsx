"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addWorkPackage, updateWorkPackage, deleteWorkPackage, setWorkPackageStatus } from "@/lib/actions";
import { StatusBadge } from "@/components/ui";

export interface WpItem {
  id: string;
  name: string;
  description: string | null;
  recTitle: string | null;
  isMilestone: boolean;
  startDate: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  status: string;
}
type Draft = { name: string; description: string; startDate: string; dueDate: string; status: string };

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"];
const NEXT: Record<string, { label: string; value: string }> = {
  NOT_STARTED: { label: "Start", value: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Done", value: "DONE" },
};
const INPUT = "w-full rounded-sm border border-ink-300 px-2 py-1 text-sm";

export function WorkPackageEditor({ trackId, items, canEdit }: { trackId: string; items: WpItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", description: "", startDate: "", dueDate: "", status: "NOT_STARTED" });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function begin(w: WpItem) {
    setErr(null);
    setEditingId(w.id);
    setDraft({ name: w.name, description: w.description ?? "", startDate: w.startDate ?? "", dueDate: w.dueDate ?? "", status: w.status });
  }
  function save(id: string) {
    if (!draft.name.trim()) { setErr("Name is required"); return; }
    start(async () => {
      try {
        await updateWorkPackage(id, trackId, {
          name: draft.name,
          description: draft.description || null,
          startDate: draft.startDate || null,
          dueDate: draft.dueDate || null,
          status: draft.status,
        });
        setEditingId(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }
  function add() {
    start(async () => {
      const id = await addWorkPackage(trackId);
      setEditingId(id);
      setDraft({ name: "New work package", description: "", startDate: "", dueDate: "", status: "NOT_STARTED" });
      router.refresh();
    });
  }
  function remove(id: string) {
    if (!confirm("Delete this work package?")) return;
    start(async () => { await deleteWorkPackage(id, trackId); router.refresh(); });
  }
  function quick(id: string, value: string) {
    start(async () => { await setWorkPackageStatus(id, trackId, value); router.refresh(); });
  }

  return (
    <div>
      <table className="w-full">
        <thead className="border-b border-ink-200"><tr>
          <th className="th">Work package</th><th className="th">From rec</th><th className="th">Due</th><th className="th">Status</th><th className="th"></th>
        </tr></thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((w) =>
            editingId === w.id ? (
              <tr key={w.id}>
                <td className="td" colSpan={5}>
                  <div className="space-y-2 py-1">
                    <input className={INPUT} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    <textarea className={INPUT} rows={2} placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="label">Start<br /><input type="date" className="rounded-sm border border-ink-300 px-2 py-1 text-sm" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
                      <label className="label">Due<br /><input type="date" className="rounded-sm border border-ink-300 px-2 py-1 text-sm" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
                      <label className="label">Status<br /><select className="rounded-sm border border-ink-300 px-2 py-1 text-sm" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}</select></label>
                      <div className="ml-auto flex gap-2">
                        <button className="btn bg-vr-600 px-3 py-1 text-xs text-white hover:bg-vr-700" disabled={pending} onClick={() => save(w.id)}>{pending ? "…" : "Save"}</button>
                        <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => { setEditingId(null); setErr(null); }}>Cancel</button>
                      </div>
                    </div>
                    {err && <p className="text-xs text-red-600">{err}</p>}
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={w.id}>
                <td className="td align-top font-medium">
                  {w.name}
                  {w.isMilestone && <span className="badge ml-1.5 bg-amber-100 text-amber-700">milestone</span>}
                  {w.description && <span className="block text-xs font-normal text-ink-400">{w.description}</span>}
                </td>
                <td className="td align-top text-xs text-ink-400">{w.recTitle ?? "—"}</td>
                <td className="td align-top text-xs">{w.dueDate ? new Date(w.dueDate).toLocaleDateString() : "—"}</td>
                <td className="td align-top"><StatusBadge status={w.status} /></td>
                <td className="td align-top whitespace-nowrap text-right">
                  {canEdit && NEXT[w.status] && (
                    <button className="btn mr-1 border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={() => quick(w.id, NEXT[w.status].value)}>{NEXT[w.status].label}</button>
                  )}
                  {canEdit && <button className="btn mr-1 border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => begin(w)}>Edit</button>}
                  {canEdit && <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(w.id)} title="Delete">✕</button>}
                </td>
              </tr>
            ),
          )}
          {items.length === 0 && <tr><td className="td text-ink-400" colSpan={5}>No work packages yet.</td></tr>}
        </tbody>
      </table>
      {canEdit && (
        <button className="btn mt-3 border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={add}>+ Add work package</button>
      )}
    </div>
  );
}
