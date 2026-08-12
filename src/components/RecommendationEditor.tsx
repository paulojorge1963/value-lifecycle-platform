"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addRecommendation, updateRecommendation, deleteRecommendation, draftRecommendation } from "@/lib/actions";
import { RecommendationStatusControl } from "./StudyControls";
import { StatusBadge } from "./ui";
import { fmtMoney } from "@/lib/finance";

interface Rec {
  id: string;
  title: string;
  summary: string | null;
  technicalDetail: string | null;
  commercialDetail: string | null;
  estimatedValue: number | null;
  estimatedCost: number | null;
  status: string;
}

type Draft = {
  title: string;
  summary: string;
  technicalDetail: string;
  commercialDetail: string;
  estimatedValue: number | null;
  estimatedCost: number | null;
};

function numOrNull(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

export function RecommendationEditor({
  studyId,
  recommendations,
  sourceAlternatives = {},
  aiEnabled = false,
  canEdit,
  canDecide,
}: {
  studyId: string;
  recommendations: Rec[];
  sourceAlternatives?: Record<string, string[]>;
  aiEnabled?: boolean;
  canEdit: boolean;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", summary: "", technicalDetail: "", commercialDetail: "", estimatedValue: null, estimatedCost: null });
  const [pending, start] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function aiDraft(id: string) {
    startDraft(async () => {
      setErr(null);
      try {
        const out = await draftRecommendation(id, studyId, draft.title);
        setDraft((d) => ({ ...d, summary: out.summary, technicalDetail: out.technicalDetail, commercialDetail: out.commercialDetail }));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "AI draft failed");
      }
    });
  }

  function beginEdit(r: Rec) {
    setErr(null);
    setEditingId(r.id);
    setDraft({
      title: r.title,
      summary: r.summary ?? "",
      technicalDetail: r.technicalDetail ?? "",
      commercialDetail: r.commercialDetail ?? "",
      estimatedValue: r.estimatedValue,
      estimatedCost: r.estimatedCost,
    });
  }

  function save(id: string) {
    start(async () => {
      try {
        await updateRecommendation(id, studyId, {
          title: draft.title,
          summary: draft.summary || null,
          technicalDetail: draft.technicalDetail || null,
          commercialDetail: draft.commercialDetail || null,
          estimatedValue: draft.estimatedValue,
          estimatedCost: draft.estimatedCost,
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
        const id = await addRecommendation(studyId);
        setEditingId(id);
        setDraft({ title: "New recommendation", summary: "", technicalDetail: "", commercialDetail: "", estimatedValue: null, estimatedCost: null });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      try {
        await deleteRecommendation(id, studyId);
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
        <h2 className="font-semibold text-ink-900">Recommendations</h2>
        {canEdit && <button className="btn-ghost" disabled={pending} onClick={add}>+ Add recommendation</button>}
      </div>

      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      <div className="space-y-3">
        {recommendations.map((r) => {
          const editing = editingId === r.id;

          if (editing) {
            return (
              <div key={r.id} className="rounded-lg border border-ve-200 bg-ve-50/40 p-4">
                <div className="space-y-2.5">
                  <div>
                    <label className="label">Title</label>
                    <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="input mt-1" />
                  </div>
                  <div>
                    <label className="label">Summary</label>
                    <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={2} className="input mt-1" />
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="label">Technical detail</label>
                      <textarea value={draft.technicalDetail} onChange={(e) => setDraft({ ...draft, technicalDetail: e.target.value })} rows={2} className="input mt-1" />
                    </div>
                    <div>
                      <label className="label">Commercial detail</label>
                      <textarea value={draft.commercialDetail} onChange={(e) => setDraft({ ...draft, commercialDetail: e.target.value })} rows={2} className="input mt-1" />
                    </div>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="label">Estimated value</label>
                      <input type="number" value={draft.estimatedValue ?? ""} onChange={(e) => setDraft({ ...draft, estimatedValue: numOrNull(e.target.value) })} className="input mt-1" />
                    </div>
                    <div>
                      <label className="label">Estimated cost</label>
                      <input type="number" value={draft.estimatedCost ?? ""} onChange={(e) => setDraft({ ...draft, estimatedCost: numOrNull(e.target.value) })} className="input mt-1" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    className="btn border border-ve-200 bg-white px-3 py-1.5 text-sm font-medium text-ve-700 hover:bg-ve-50 disabled:opacity-50"
                    disabled={drafting}
                    title={aiEnabled ? "Draft with Claude" : "Insert template starter text (set ANTHROPIC_API_KEY for AI drafting)"}
                    onClick={() => aiDraft(r.id)}
                  >
                    {drafting ? "Drafting…" : aiEnabled ? "✨ Draft with AI" : "✨ Draft (template)"}
                  </button>
                  <div className="flex gap-2">
                    <button className="btn border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100" onClick={() => setEditingId(null)}>Cancel</button>
                    <button className="btn-ve" disabled={pending} onClick={() => save(r.id)}>{pending ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={r.id} className="rounded-lg border border-ink-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-ink-900">{r.title}</div>
                  {sourceAlternatives[r.id]?.length > 0 && (
                    <p className="mt-0.5 text-xs text-vr-700">developed from: {sourceAlternatives[r.id].join(", ")}</p>
                  )}
                  {r.summary && <p className="mt-0.5 text-sm text-ink-600">{r.summary}</p>}
                  {(r.technicalDetail || r.commercialDetail) && (
                    <div className="mt-2 grid gap-2 text-xs text-ink-500 sm:grid-cols-2">
                      {r.technicalDetail && <div><span className="label">Technical</span><p className="mt-0.5">{r.technicalDetail}</p></div>}
                      {r.commercialDetail && <div><span className="label">Commercial</span><p className="mt-0.5">{r.commercialDetail}</p></div>}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-ink-500">
                  Value <b className="text-ink-800">{fmtMoney(r.estimatedValue)}</b> · Cost {fmtMoney(r.estimatedCost)}
                </div>
                <div className="flex items-center gap-2">
                  <RecommendationStatusControl id={r.id} studyId={studyId} status={r.status} canDecide={canDecide} />
                  {canEdit && (
                    <>
                      <button className="btn border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => beginEdit(r)}>Edit</button>
                      <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(r.id)}>✕</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {recommendations.length === 0 && <p className="text-sm text-ink-500">No recommendations developed yet.{canEdit ? " Add one above." : ""}</p>}
      </div>
    </div>
  );
}
