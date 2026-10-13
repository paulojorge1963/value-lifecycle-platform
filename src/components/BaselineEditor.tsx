"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addInfoItem, updateInfoItem, deleteInfoItem } from "@/lib/actions";

export interface BaselineRow { id: string; label: string; value: string | null; source: string | null }
type Draft = { label: string; value: string; source: string };
const INPUT = "w-full rounded-sm border border-ink-300 px-2 py-1 text-sm";

export function BaselineEditor({ studyId, items, canEdit }: { studyId: string; items: BaselineRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ label: "", value: "", source: "" });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function begin(it: BaselineRow) { setErr(null); setEditingId(it.id); setDraft({ label: it.label, value: it.value ?? "", source: it.source ?? "" }); }
  function save(id: string) {
    if (!draft.label.trim()) { setErr("A measure name is required"); return; }
    start(async () => {
      try { await updateInfoItem(id, studyId, { label: draft.label, value: draft.value || null, source: draft.source || null }); setEditingId(null); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    });
  }
  function add() { start(async () => { const id = await addInfoItem(studyId); setEditingId(id); setDraft({ label: "New baseline measure", value: "", source: "" }); router.refresh(); }); }
  function remove(id: string) { if (!confirm("Delete this baseline measure?")) return; start(async () => { await deleteInfoItem(id, studyId); router.refresh(); }); }

  return (
    <div>
      <table className="w-full">
        <thead className="border-b border-ink-200"><tr>
          <th className="th">Measure</th><th className="th">Value</th><th className="th">Source</th><th className="th"></th>
        </tr></thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((it) => editingId === it.id ? (
            <tr key={it.id}><td className="td" colSpan={4}>
              <div className="space-y-2 py-1">
                <input className={INPUT} placeholder="Measure / metric" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  <input className={INPUT + " flex-1"} placeholder="Current value (e.g. 68.8 % )" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                  <input className={INPUT + " flex-1"} placeholder="Source / assumption / confidence" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button className="btn bg-ve-600 px-3 py-1 text-xs text-white hover:bg-ve-700" disabled={pending} onClick={() => save(it.id)}>{pending ? "…" : "Save"}</button>
                  <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => { setEditingId(null); setErr(null); }}>Cancel</button>
                </div>
                {err && <p className="text-xs text-red-600">{err}</p>}
              </div>
            </td></tr>
          ) : (
            <tr key={it.id}>
              <td className="td font-medium">{it.label}</td>
              <td className="td text-sm">{it.value || "—"}</td>
              <td className="td text-xs text-ink-400">{it.source || "—"}</td>
              <td className="td whitespace-nowrap text-right">
                {canEdit && <button className="btn mr-1 border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => begin(it)}>Edit</button>}
                {canEdit && <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(it.id)} title="Delete">✕</button>}
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td className="td text-ink-400" colSpan={4}>No baseline measures yet.</td></tr>}
        </tbody>
      </table>
      {canEdit && <button className="btn mt-3 border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={add}>+ Add baseline measure</button>}
    </div>
  );
}
