"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addFunction, updateFunction, deleteFunction } from "@/lib/actions";
import { fmtMoney } from "@/lib/finance";

interface Fn {
  id: string;
  verb: string;
  noun: string;
  kind: string;
  cost: number | null;
  worth: number | null;
  parentId: string | null;
}

type Draft = { verb: string; noun: string; kind: string; cost: number | null; worth: number | null; parentId: string | null };

const label = (f: { verb: string; noun: string } | undefined) =>
  f ? `${f.verb} ${f.noun}`.trim() || "Untitled function" : "";

function numOrNull(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

export function FunctionEditor({ studyId, functions, canEdit }: { studyId: string; functions: Fn[]; canEdit: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ verb: "", noun: "", kind: "SECONDARY", cost: null, worth: null, parentId: null });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function beginEdit(f: Fn) {
    setErr(null);
    setEditingId(f.id);
    setDraft({ verb: f.verb, noun: f.noun, kind: f.kind, cost: f.cost, worth: f.worth, parentId: f.parentId });
  }

  function save(id: string) {
    start(async () => {
      try {
        await updateFunction(id, studyId, draft);
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
        const id = await addFunction(studyId);
        setEditingId(id);
        setDraft({ verb: "", noun: "", kind: "SECONDARY", cost: null, worth: null, parentId: null });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      try {
        await deleteFunction(id, studyId);
        if (editingId === id) setEditingId(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">Function model</h2>
        <span className="text-xs text-ink-400">verb-noun · cost vs worth · value index</span>
      </div>

      {functions.length === 0 && editingId === null ? (
        <p className="text-sm text-ink-500">No functions defined yet. {canEdit ? "Add the first function below." : "Add them in the Function Analysis phase."}</p>
      ) : (
        <table className="w-full">
          <thead className="border-b border-ink-200">
            <tr>
              <th className="th">Function</th>
              <th className="th">Kind</th>
              <th className="th text-right">Cost</th>
              <th className="th text-right">Worth</th>
              <th className="th text-right">Index</th>
              {canEdit && <th className="th text-right">Edit</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {functions.map((f) => {
              const editing = editingId === f.id;
              const idx = f.cost && f.worth ? f.cost / f.worth : null;
              const poor = idx != null && idx > 1.5;

              if (editing) {
                return (
                  <tr key={f.id} className="bg-ve-50/50">
                    <td className="td">
                      <div className="flex gap-1.5">
                        <input value={draft.verb} onChange={(e) => setDraft({ ...draft, verb: e.target.value })} placeholder="verb" className="w-24 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <input value={draft.noun} onChange={(e) => setDraft({ ...draft, noun: e.target.value })} placeholder="noun" className="w-28 rounded border border-ink-300 px-2 py-1 text-sm" />
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-ink-400">
                        <span>supports (why) →</span>
                        <select
                          value={draft.parentId ?? ""}
                          onChange={(e) => setDraft({ ...draft, parentId: e.target.value || null })}
                          className="rounded border border-ink-300 px-1.5 py-0.5 text-xs text-ink-700"
                        >
                          <option value="">— top-level —</option>
                          {functions.filter((x) => x.id !== f.id).map((x) => (
                            <option key={x.id} value={x.id}>{label(x)}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="td">
                      <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="rounded border border-ink-300 px-2 py-1 text-sm">
                        <option value="BASIC">basic</option>
                        <option value="SECONDARY">secondary</option>
                      </select>
                    </td>
                    <td className="td text-right">
                      <input type="number" value={draft.cost ?? ""} onChange={(e) => setDraft({ ...draft, cost: numOrNull(e.target.value) })} className="w-24 rounded border border-ink-300 px-2 py-1 text-right text-sm" />
                    </td>
                    <td className="td text-right">
                      <input type="number" value={draft.worth ?? ""} onChange={(e) => setDraft({ ...draft, worth: numOrNull(e.target.value) })} className="w-24 rounded border border-ink-300 px-2 py-1 text-right text-sm" />
                    </td>
                    <td className="td text-right text-ink-400">
                      {draft.cost && draft.worth ? (draft.cost / draft.worth).toFixed(2) : "—"}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn bg-ve-600 px-2.5 py-1 text-xs text-white hover:bg-ve-700" disabled={pending} onClick={() => save(f.id)}>{pending ? "…" : "Save"}</button>
                        <button className="btn border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={f.id} className={poor ? "bg-amber-50/60" : ""}>
                  <td className="td font-medium">
                    {f.verb || f.noun ? `${f.verb} ${f.noun}`.trim() : <span className="text-ink-400">Untitled function</span>}
                    {f.parentId && (
                      <div className="text-xs font-normal text-ink-400">supports: {label(functions.find((x) => x.id === f.parentId))}</div>
                    )}
                  </td>
                  <td className="td"><span className={`badge ${f.kind === "BASIC" ? "bg-ve-100 text-ve-700" : "bg-ink-100 text-ink-600"}`}>{f.kind.toLowerCase()}</span></td>
                  <td className="td text-right">{fmtMoney(f.cost)}</td>
                  <td className="td text-right">{fmtMoney(f.worth)}</td>
                  <td className={`td text-right font-medium ${poor ? "text-amber-700" : "text-ink-600"}`}>{idx ? idx.toFixed(2) : "—"}</td>
                  {canEdit && (
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => beginEdit(f)}>Edit</button>
                        <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(f.id)}>✕</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {canEdit && (
        <button className="btn-ghost mt-3" disabled={pending} onClick={add}>+ Add function</button>
      )}
    </div>
  );
}
