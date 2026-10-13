"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addKpiTarget, updateKpiTarget, deleteKpiTarget } from "@/lib/actions";
import { KpiActualForm } from "@/components/TrackControls";

export interface KpiRow {
  id: string; kpiKey: string; name: string;
  baselineValue: number | null; targetValue: number | null; unit: string;
  frequency: string | null; dataSource: string | null; ownerName: string | null;
  actuals: { id: string; periodLabel: string; value: number }[];
}
export interface KpiCatalog { key: string; name: string; unit: string }
type Draft = { kpiKey: string; baselineValue: string; targetValue: string; unit: string; frequency: string; dataSource: string; ownerName: string };
const INPUT = "rounded-sm border border-ink-300 px-2 py-1 text-sm";
const n = (s: string) => (s.trim() === "" ? null : Number(s));

export function KpiTargetEditor({ trackId, items, catalog, canEdit, canKpi }: { trackId: string; items: KpiRow[]; catalog: KpiCatalog[]; canEdit: boolean; canKpi: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ kpiKey: "", baselineValue: "", targetValue: "", unit: "", frequency: "quarterly", dataSource: "", ownerName: "" });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function begin(k: KpiRow) {
    setErr(null); setEditingId(k.id);
    setDraft({ kpiKey: k.kpiKey, baselineValue: k.baselineValue?.toString() ?? "", targetValue: k.targetValue?.toString() ?? "", unit: k.unit, frequency: k.frequency ?? "", dataSource: k.dataSource ?? "", ownerName: k.ownerName ?? "" });
  }
  function pickKpi(key: string) { const c = catalog.find((x) => x.key === key); setDraft((d) => ({ ...d, kpiKey: key, unit: c?.unit ?? d.unit })); }
  function save(id: string) {
    start(async () => {
      try {
        await updateKpiTarget(id, trackId, { kpiKey: draft.kpiKey, unit: draft.unit, baselineValue: n(draft.baselineValue), targetValue: n(draft.targetValue), frequency: draft.frequency || null, dataSource: draft.dataSource || null, ownerName: draft.ownerName || null });
        setEditingId(null); router.refresh();
      } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    });
  }
  function add() {
    const first = catalog[0]; if (!first) return;
    start(async () => { const id = await addKpiTarget(trackId, first.key, first.unit); begin({ id, kpiKey: first.key, name: first.name, baselineValue: null, targetValue: null, unit: first.unit, frequency: "quarterly", dataSource: null, ownerName: null, actuals: [] }); router.refresh(); });
  }
  function remove(id: string) { if (!confirm("Delete this KPI target?")) return; start(async () => { await deleteKpiTarget(id, trackId); router.refresh(); }); }

  return (
    <div className="space-y-4">
      {items.map((k) => {
        const latest = k.actuals[k.actuals.length - 1];
        return (
          <div key={k.id} className="rounded-lg border border-ink-200 p-4">
            {editingId === k.id ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="label">KPI<br /><select className={INPUT} value={draft.kpiKey} onChange={(e) => pickKpi(e.target.value)}>{catalog.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
                  <label className="label">Baseline<br /><input className={INPUT + " w-24"} value={draft.baselineValue} onChange={(e) => setDraft({ ...draft, baselineValue: e.target.value })} /></label>
                  <label className="label">Target<br /><input className={INPUT + " w-24"} value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })} /></label>
                  <label className="label">Unit<br /><input className={INPUT + " w-16"} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></label>
                  <label className="label">Frequency<br /><input className={INPUT + " w-24"} value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} /></label>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="label flex-1">Data source<br /><input className={INPUT + " w-full"} value={draft.dataSource} onChange={(e) => setDraft({ ...draft, dataSource: e.target.value })} /></label>
                  <label className="label flex-1">Owner<br /><input className={INPUT + " w-full"} value={draft.ownerName} onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} /></label>
                  <div className="ml-auto flex gap-2">
                    <button className="btn bg-vr-600 px-3 py-1 text-xs text-white hover:bg-vr-700" disabled={pending} onClick={() => save(k.id)}>{pending ? "…" : "Save"}</button>
                    <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => { setEditingId(null); setErr(null); }}>Cancel</button>
                  </div>
                </div>
                {err && <p className="text-xs text-red-600">{err}</p>}
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-ink-900">{k.name}</div>
                    <div className="text-xs text-ink-400">Baseline {k.baselineValue ?? "—"} → Target {k.targetValue ?? "—"} {k.unit} · {k.dataSource ?? "—"} · {k.frequency ?? "—"}{k.ownerName ? ` · ${k.ownerName}` : ""}</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <div className="label">Latest</div>
                      <div className="text-lg font-semibold text-vr-700">{latest ? `${latest.value} ${k.unit}` : "—"}</div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button className="btn border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => begin(k)}>Edit</button>
                        <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(k.id)} title="Delete">✕</button>
                      </div>
                    )}
                  </div>
                </div>
                {k.actuals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {k.actuals.map((a) => <span key={a.id} className="rounded-sm bg-ink-100 px-2 py-0.5 text-ink-600">{a.periodLabel}: {a.value}</span>)}
                  </div>
                )}
                <div className="mt-3"><KpiActualForm trackId={trackId} kpiTargetId={k.id} unit={k.unit} canEdit={canKpi} /></div>
              </>
            )}
          </div>
        );
      })}
      {items.length === 0 && <p className="text-sm text-ink-500">No KPIs yet — add one to baseline and track it.</p>}
      {canEdit && catalog.length > 0 && <button className="btn border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={add}>+ Add KPI</button>}
    </div>
  );
}
