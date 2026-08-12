"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCostItem, updateCostItem, deleteCostItem, updateBusinessCaseCurrency } from "@/lib/actions";
import { CURRENCIES, fmtMoney } from "@/lib/finance";

interface Item {
  id: string;
  label: string;
  kind: string;
  category: string | null;
  amount: number;
  year: number | null;
  recurring: boolean;
}

type Draft = { label: string; kind: string; category: string; amount: number; year: number | null; recurring: boolean };

const KINDS = ["CAPEX", "OPEX", "ONE_OFF", "RECURRING", "BENEFIT"];
const CATEGORIES = ["", "COST_SAVING", "REVENUE_UPLIFT", "RISK_REDUCTION", "TIME_SAVING", "QUALITY", "SCHEDULE", "RELIABILITY", "OTHER"];

function numOrNull(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

export function CostItemEditor({
  businessCaseId,
  studyId,
  items,
  currency,
  canEdit,
}: {
  businessCaseId: string;
  studyId: string;
  items: Item[];
  currency: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ label: "", kind: "OPEX", category: "", amount: 0, year: 0, recurring: false });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function beginEdit(it: Item) {
    setErr(null);
    setEditingId(it.id);
    setDraft({ label: it.label, kind: it.kind, category: it.category ?? "", amount: it.amount, year: it.year, recurring: it.recurring });
  }
  function save(id: string) {
    start(async () => {
      try {
        await updateCostItem(id, studyId, {
          label: draft.label,
          kind: draft.kind,
          category: draft.category || null,
          amount: Number(draft.amount) || 0,
          year: draft.year,
          recurring: draft.recurring,
        });
        setEditingId(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  }
  function add() {
    start(async () => {
      try {
        const id = await addCostItem(businessCaseId, studyId);
        setEditingId(id);
        setDraft({ label: "New line item", kind: "OPEX", category: "", amount: 0, year: 0, recurring: false });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Add failed");
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      try {
        await deleteCostItem(id, studyId);
        if (editingId === id) setEditingId(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }
  function changeCurrency(code: string) {
    start(async () => {
      await updateBusinessCaseCurrency(businessCaseId, studyId, code);
      router.refresh();
    });
  }

  return (
    <div className="card card-pad">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink-900">Cost / benefit line items</h2>
        <div className="flex items-center gap-2">
          <label className="label">Currency</label>
          <select
            value={currency}
            disabled={!canEdit || pending}
            onChange={(e) => changeCurrency(e.target.value)}
            className="rounded-lg border border-ink-300 px-2 py-1 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
          {canEdit && <button className="btn-ghost" disabled={pending} onClick={add}>+ Add line</button>}
        </div>
      </div>

      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      <table className="w-full">
        <thead className="border-b border-ink-200">
          <tr>
            <th className="th">Line item</th>
            <th className="th">Type</th>
            <th className="th">Category</th>
            <th className="th">Year</th>
            <th className="th text-right">Amount</th>
            {canEdit && <th className="th text-right">Edit</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {items.map((c) => {
            const editing = editingId === c.id;
            if (editing) {
              return (
                <tr key={c.id} className="bg-ve-50/50">
                  <td className="td"><input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="w-full rounded border border-ink-300 px-2 py-1 text-sm" /></td>
                  <td className="td">
                    <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="rounded border border-ink-300 px-1.5 py-1 text-sm">
                      {KINDS.map((k) => <option key={k} value={k}>{k.toLowerCase()}</option>)}
                    </select>
                  </td>
                  <td className="td">
                    <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="rounded border border-ink-300 px-1.5 py-1 text-sm">
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat ? cat.replaceAll("_", " ").toLowerCase() : "—"}</option>)}
                    </select>
                  </td>
                  <td className="td"><input type="number" value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: numOrNull(e.target.value) })} className="w-16 rounded border border-ink-300 px-2 py-1 text-sm" /></td>
                  <td className="td text-right"><input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} className="w-28 rounded border border-ink-300 px-2 py-1 text-right text-sm" /></td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1.5">
                      <label className="mr-1 flex items-center gap-1 text-xs text-ink-500"><input type="checkbox" checked={draft.recurring} onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })} /> recurring</label>
                      <button className="btn bg-ve-600 px-2.5 py-1 text-xs text-white hover:bg-ve-700" disabled={pending} onClick={() => save(c.id)}>{pending ? "…" : "Save"}</button>
                      <button className="btn border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              );
            }
            return (
              <tr key={c.id}>
                <td className="td font-medium">{c.label}</td>
                <td className="td">
                  <span className={`badge ${c.kind === "BENEFIT" ? "bg-vr-100 text-vr-700" : "bg-ink-100 text-ink-600"}`}>{c.kind.toLowerCase()}{c.recurring ? " · recurring" : ""}</span>
                </td>
                <td className="td text-xs text-ink-500">{c.category ? c.category.replaceAll("_", " ").toLowerCase() : "—"}</td>
                <td className="td">{c.year ?? "—"}</td>
                <td className={`td text-right font-medium ${c.kind === "BENEFIT" ? "text-vr-700" : "text-ink-800"}`}>
                  {c.kind === "BENEFIT" ? "+" : "−"}{fmtMoney(c.amount, currency)}
                </td>
                {canEdit && (
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => beginEdit(c)}>Edit</button>
                      <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(c.id)}>✕</button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {items.length === 0 && <tr><td className="td text-ink-400" colSpan={canEdit ? 6 : 5}>No line items yet.{canEdit ? " Add cost and benefit lines to drive the financials." : ""}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
