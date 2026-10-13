"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAdoptionActivity, updateAdoptionActivity, deleteAdoptionActivity } from "@/lib/actions";
import { StatusBadge } from "@/components/ui";

export interface AdoptionRow { id: string; label: string; audience: string | null; dueDate: string | null; status: string }
type Draft = { label: string; audience: string; dueDate: string; status: string };
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"];
const INPUT = "rounded-sm border border-ink-300 px-2 py-1 text-sm";

export function AdoptionEditor({ trackId, items, canEdit }: { trackId: string; items: AdoptionRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ label: "", audience: "", dueDate: "", status: "NOT_STARTED" });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function begin(a: AdoptionRow) { setErr(null); setEditingId(a.id); setDraft({ label: a.label, audience: a.audience ?? "", dueDate: a.dueDate ?? "", status: a.status }); }
  function save(id: string) {
    if (!draft.label.trim()) { setErr("Activity is required"); return; }
    start(async () => {
      try { await updateAdoptionActivity(id, trackId, { label: draft.label, audience: draft.audience || null, dueDate: draft.dueDate || null, status: draft.status }); setEditingId(null); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    });
  }
  function add() { start(async () => { const id = await addAdoptionActivity(trackId); setEditingId(id); setDraft({ label: "New adoption activity", audience: "", dueDate: "", status: "NOT_STARTED" }); router.refresh(); }); }
  function remove(id: string) { if (!confirm("Delete this activity?")) return; start(async () => { await deleteAdoptionActivity(id, trackId); router.refresh(); }); }

  return (
    <div>
      <ul className="space-y-1.5 text-sm">
        {items.map((a) => editingId === a.id ? (
          <li key={a.id} className="space-y-2 rounded-md border border-ink-200 p-2">
            <input className={INPUT + " w-full"} placeholder="Activity" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            <div className="flex flex-wrap items-end gap-2">
              <input className={INPUT + " flex-1"} placeholder="Audience / who's impacted" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} />
              <label className="label">Due<br /><input type="date" className={INPUT} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
              <label className="label">Status<br /><select className={INPUT} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}</select></label>
              <div className="ml-auto flex gap-2">
                <button className="btn bg-vr-600 px-3 py-1 text-xs text-white hover:bg-vr-700" disabled={pending} onClick={() => save(a.id)}>{pending ? "…" : "Save"}</button>
                <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => { setEditingId(null); setErr(null); }}>Cancel</button>
              </div>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
          </li>
        ) : (
          <li key={a.id} className="flex items-center justify-between gap-2">
            <span className="text-ink-700">{a.label}{a.audience && <span className="text-ink-400"> · {a.audience}</span>}{a.dueDate && <span className="text-ink-400"> · due {new Date(a.dueDate).toLocaleDateString()}</span>}</span>
            <span className="flex items-center gap-1.5">
              <StatusBadge status={a.status} />
              {canEdit && <button className="btn border border-ink-200 px-2 py-0.5 text-xs text-ink-600 hover:bg-ink-100" onClick={() => begin(a)}>Edit</button>}
              {canEdit && <button className="btn px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(a.id)} title="Delete">✕</button>}
            </span>
          </li>
        ))}
        {items.length === 0 && <li className="text-ink-400">No adoption activities yet.</li>}
      </ul>
      {canEdit && <button className="btn mt-3 border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={add}>+ Add activity</button>}
    </div>
  );
}
