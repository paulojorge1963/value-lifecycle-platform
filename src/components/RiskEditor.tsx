"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addRisk, updateRisk, deleteRisk } from "@/lib/actions";

export interface RiskRow {
  id: string;
  title: string;
  description: string | null;
  likelihood: number | null;
  impact: number | null;
  mitigation: string | null;
  owner: string | null;
  status: string;
}
type Draft = { title: string; description: string; likelihood: string; impact: string; mitigation: string; owner: string; status: string };
const STATUSES = ["OPEN", "MITIGATING", "CLOSED", "ACCEPTED"];
const SCALE = ["", "1", "2", "3", "4", "5"];
const INPUT = "w-full rounded-sm border border-ink-300 px-2 py-1 text-sm";
const SEL = "rounded-sm border border-ink-300 px-2 py-1 text-sm";
const score = (l: number | null, i: number | null) => (l && i ? l * i : null);
const badge = (s: number | null) => (s == null ? "bg-ink-50 text-ink-400" : s >= 15 ? "bg-red-100 text-red-700" : s >= 8 ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-600");

export function RiskEditor({ parent, parentId, items, canEdit }: { parent: "study" | "track"; parentId: string; items: RiskRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", description: "", likelihood: "", impact: "", mitigation: "", owner: "", status: "OPEN" });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function begin(r: RiskRow) {
    setErr(null); setEditingId(r.id);
    setDraft({ title: r.title, description: r.description ?? "", likelihood: r.likelihood?.toString() ?? "", impact: r.impact?.toString() ?? "", mitigation: r.mitigation ?? "", owner: r.owner ?? "", status: r.status });
  }
  function save(id: string) {
    if (!draft.title.trim()) { setErr("A risk title is required"); return; }
    start(async () => {
      try {
        await updateRisk(id, parent, parentId, {
          title: draft.title, description: draft.description || null,
          likelihood: draft.likelihood ? Number(draft.likelihood) : null, impact: draft.impact ? Number(draft.impact) : null,
          mitigation: draft.mitigation || null, owner: draft.owner || null, status: draft.status,
        });
        setEditingId(null); router.refresh();
      } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    });
  }
  function add() { start(async () => { const id = await addRisk(parent, parentId); setEditingId(id); setDraft({ title: "New risk", description: "", likelihood: "", impact: "", mitigation: "", owner: "", status: "OPEN" }); router.refresh(); }); }
  function remove(id: string) { if (!confirm("Delete this risk?")) return; start(async () => { await deleteRisk(id, parent, parentId); router.refresh(); }); }

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem]">
        <thead className="border-b border-ink-200"><tr>
          <th className="th">Risk</th><th className="th">L</th><th className="th">I</th><th className="th">Score</th><th className="th">Status</th><th className="th"></th>
        </tr></thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((r) => editingId === r.id ? (
            <tr key={r.id}><td className="td" colSpan={6}>
              <div className="space-y-2 py-1">
                <input className={INPUT} placeholder="Risk / description" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <textarea className={INPUT} rows={2} placeholder="Mitigation" value={draft.mitigation} onChange={(e) => setDraft({ ...draft, mitigation: e.target.value })} />
                <div className="flex flex-wrap items-end gap-3">
                  <label className="label">Likelihood<br /><select className={SEL} value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: e.target.value })}>{SCALE.map((s) => <option key={s} value={s}>{s || "—"}</option>)}</select></label>
                  <label className="label">Impact<br /><select className={SEL} value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value })}>{SCALE.map((s) => <option key={s} value={s}>{s || "—"}</option>)}</select></label>
                  <label className="label">Owner<br /><input className={SEL} value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></label>
                  <label className="label">Status<br /><select className={SEL} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</select></label>
                  <div className="ml-auto flex gap-2">
                    <button className="btn bg-ve-600 px-3 py-1 text-xs text-white hover:bg-ve-700" disabled={pending} onClick={() => save(r.id)}>{pending ? "…" : "Save"}</button>
                    <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => { setEditingId(null); setErr(null); }}>Cancel</button>
                  </div>
                </div>
                {err && <p className="text-xs text-red-600">{err}</p>}
              </div>
            </td></tr>
          ) : (
            <tr key={r.id}>
              <td className="td align-top font-medium">{r.title}
                {r.mitigation && <span className="block text-xs font-normal text-ink-400">↳ {r.mitigation}</span>}
                {r.owner && <span className="block text-[11px] font-normal text-ink-400">owner: {r.owner}</span>}
              </td>
              <td className="td align-top text-xs">{r.likelihood ?? "—"}</td>
              <td className="td align-top text-xs">{r.impact ?? "—"}</td>
              <td className="td align-top"><span className={`badge ${badge(score(r.likelihood, r.impact))}`}>{score(r.likelihood, r.impact) ?? "—"}</span></td>
              <td className="td align-top text-xs">{r.status.toLowerCase()}</td>
              <td className="td align-top whitespace-nowrap text-right">
                {canEdit && <button className="btn mr-1 border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => begin(r)}>Edit</button>}
                {canEdit && <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(r.id)} title="Delete">✕</button>}
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td className="td text-ink-400" colSpan={6}>No risks logged yet.</td></tr>}
        </tbody>
      </table>
      </div>
      {canEdit && <button className="btn mt-3 border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={add}>+ Add risk</button>}
    </div>
  );
}
