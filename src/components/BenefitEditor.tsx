"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addBenefit, updateBenefit, deleteBenefit } from "@/lib/actions";
import { fmtMoney } from "@/lib/finance";

export interface BenefitRow { id: string; label: string; category: string; plannedValue: number; realizedValue: number }
type Draft = { label: string; category: string; plannedValue: string; realizedValue: string };
const CATEGORIES = ["COST_SAVING", "REVENUE_UPLIFT", "RISK_REDUCTION", "TIME_SAVING", "QUALITY", "SCHEDULE", "RELIABILITY", "OTHER"];
const INPUT = "rounded-sm border border-ink-300 px-2 py-1 text-sm";
const num = (s: string) => (s.trim() === "" ? 0 : Number(s) || 0);

export function BenefitEditor({ trackId, currency, items, canEdit }: { trackId: string; currency: string; items: BenefitRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ label: "", category: "COST_SAVING", plannedValue: "", realizedValue: "" });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function begin(b: BenefitRow) { setErr(null); setEditingId(b.id); setDraft({ label: b.label, category: b.category, plannedValue: b.plannedValue ? String(b.plannedValue) : "", realizedValue: b.realizedValue ? String(b.realizedValue) : "" }); }
  function save(id: string) {
    if (!draft.label.trim()) { setErr("A benefit name is required"); return; }
    start(async () => {
      try { await updateBenefit(id, trackId, { label: draft.label, category: draft.category, plannedValue: num(draft.plannedValue), realizedValue: num(draft.realizedValue) }); setEditingId(null); router.refresh(); }
      catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    });
  }
  function add() { start(async () => { const id = await addBenefit(trackId, currency); setEditingId(id); setDraft({ label: "New benefit", category: "COST_SAVING", plannedValue: "", realizedValue: "" }); router.refresh(); }); }
  function remove(id: string) { if (!confirm("Delete this benefit?")) return; start(async () => { await deleteBenefit(id, trackId); router.refresh(); }); }

  return (
    <div className="space-y-3">
      {items.map((b) => editingId === b.id ? (
        <div key={b.id} className="space-y-2 rounded-md border border-ink-200 p-2">
          <input className={INPUT + " w-full"} placeholder="Benefit" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="label">Category<br /><select className={INPUT} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ").toLowerCase()}</option>)}</select></label>
            <label className="label">Planned ({currency})<br /><input className={INPUT + " w-28"} value={draft.plannedValue} onChange={(e) => setDraft({ ...draft, plannedValue: e.target.value })} /></label>
            <label className="label">Realised ({currency})<br /><input className={INPUT + " w-28"} value={draft.realizedValue} onChange={(e) => setDraft({ ...draft, realizedValue: e.target.value })} /></label>
            <div className="ml-auto flex gap-2">
              <button className="btn bg-vr-600 px-3 py-1 text-xs text-white hover:bg-vr-700" disabled={pending} onClick={() => save(b.id)}>{pending ? "…" : "Save"}</button>
              <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => { setEditingId(null); setErr(null); }}>Cancel</button>
            </div>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      ) : (
        <div key={b.id}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-ink-800">{b.label}<span className="ml-1.5 text-xs font-normal text-ink-400">{b.category.replace(/_/g, " ").toLowerCase()}</span></span>
            <span className="flex items-center gap-2">
              <span className="text-ink-500">{fmtMoney(b.realizedValue, currency)} / {fmtMoney(b.plannedValue, currency)}</span>
              {canEdit && <button className="btn border border-ink-200 px-2 py-0.5 text-xs text-ink-600 hover:bg-ink-100" onClick={() => begin(b)}>Edit</button>}
              {canEdit && <button className="btn px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(b.id)} title="Delete">✕</button>}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-vr-500" style={{ width: `${b.plannedValue > 0 ? Math.min(100, (b.realizedValue / b.plannedValue) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-ink-500">No benefits tracked yet.</p>}
      {canEdit && <button className="btn mt-1 border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={add}>+ Add benefit</button>}
    </div>
  );
}
