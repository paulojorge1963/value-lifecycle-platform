"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAlternative, updateAlternative, deleteAlternative, promoteAlternative, brainstormAlternatives } from "@/lib/actions";

interface Alt {
  id: string;
  idea: string;
  description: string | null;
  functionId: string | null;
  shortlisted: boolean;
  recommendationId: string | null;
}
interface Fn {
  id: string;
  verb: string;
  noun: string;
}

type Draft = { idea: string; description: string; functionId: string; shortlisted: boolean };

export function AlternativeEditor({
  studyId,
  alternatives,
  functions,
  recommendations,
  aiEnabled = false,
  canEdit,
}: {
  studyId: string;
  alternatives: Alt[];
  functions: Fn[];
  recommendations: { id: string; title: string }[];
  aiEnabled?: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ idea: "", description: "", functionId: "", shortlisted: false });
  const [pending, start] = useTransition();
  const [brainstorming, startBrainstorm] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function brainstorm() {
    startBrainstorm(async () => {
      setErr(null);
      try {
        await brainstormAlternatives(studyId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Brainstorm failed");
      }
    });
  }

  const fnLabel = (id: string | null) => {
    const f = functions.find((x) => x.id === id);
    return f ? `${f.verb} ${f.noun}`.trim() : null;
  };
  const recTitle = (id: string | null) => recommendations.find((r) => r.id === id)?.title ?? null;

  function promote(id: string) {
    start(async () => {
      try {
        await promoteAlternative(id, studyId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Promote failed");
      }
    });
  }

  function beginEdit(a: Alt) {
    setErr(null);
    setEditingId(a.id);
    setDraft({ idea: a.idea, description: a.description ?? "", functionId: a.functionId ?? "", shortlisted: a.shortlisted });
  }
  function save(id: string) {
    start(async () => {
      try {
        await updateAlternative(id, studyId, {
          idea: draft.idea,
          description: draft.description || null,
          functionId: draft.functionId || null,
          shortlisted: draft.shortlisted,
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
        const id = await addAlternative(studyId);
        setEditingId(id);
        setDraft({ idea: "", description: "", functionId: "", shortlisted: false });
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Add failed");
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      try {
        await deleteAlternative(id, studyId);
        if (editingId === id) setEditingId(null);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }
  function toggleShortlist(a: Alt) {
    start(async () => {
      await updateAlternative(a.id, studyId, { shortlisted: !a.shortlisted });
      router.refresh();
    });
  }

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900">Creative alternatives</h2>
          <span className="text-xs text-ink-400">generate options per function · shortlist for evaluation</span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              className="btn border border-ve-200 bg-white px-3 py-2 text-sm font-medium text-ve-700 hover:bg-ve-50 disabled:opacity-50"
              disabled={brainstorming}
              title={aiEnabled ? "Generate creative alternatives with Claude" : "Seed alternatives from the industry value levers (set ANTHROPIC_API_KEY for AI)"}
              onClick={brainstorm}
            >
              {brainstorming ? "Generating…" : aiEnabled ? "✨ Brainstorm with AI" : "✨ Brainstorm (template)"}
            </button>
            <button className="btn-ghost" disabled={pending} onClick={add}>+ Add alternative</button>
          </div>
        )}
      </div>

      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      <div className="space-y-2.5">
        {alternatives.map((a) => {
          const editing = editingId === a.id;

          if (editing) {
            return (
              <div key={a.id} className="rounded-lg border border-ve-200 bg-ve-50/40 p-3">
                <div className="space-y-2.5">
                  <div>
                    <label className="label">Idea</label>
                    <input value={draft.idea} onChange={(e) => setDraft({ ...draft, idea: e.target.value })} placeholder="e.g. Substitute precast panels" className="input mt-1" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="input mt-1" />
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="label">Improves function</label>
                      <select value={draft.functionId} onChange={(e) => setDraft({ ...draft, functionId: e.target.value })} className="input mt-1">
                        <option value="">— none —</option>
                        {functions.map((f) => (
                          <option key={f.id} value={f.id}>{`${f.verb} ${f.noun}`.trim() || "Untitled function"}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-end gap-2 pb-2 text-sm text-ink-700">
                      <input type="checkbox" checked={draft.shortlisted} onChange={(e) => setDraft({ ...draft, shortlisted: e.target.checked })} className="h-4 w-4" />
                      Shortlisted for evaluation
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button className="btn border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn-ve" disabled={pending} onClick={() => save(a.id)}>{pending ? "Saving…" : "Save"}</button>
                </div>
              </div>
            );
          }

          return (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink-200 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {a.shortlisted && <span className="badge bg-amber-100 text-amber-700">shortlisted</span>}
                  {a.recommendationId && <span className="badge bg-vr-100 text-vr-700">→ recommendation</span>}
                  <span className="font-medium text-ink-900">{a.idea || <span className="text-ink-400">Untitled idea</span>}</span>
                </div>
                {a.description && <p className="mt-0.5 text-sm text-ink-600">{a.description}</p>}
                {a.functionId && <p className="mt-1 text-xs text-ink-400">improves: {fnLabel(a.functionId)}</p>}
                {a.recommendationId && (
                  <p className="mt-1 text-xs text-vr-700">developed as: {recTitle(a.recommendationId) ?? "recommendation"}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.recommendationId ? (
                    <span className="text-xs text-ink-400">promoted ✓</span>
                  ) : (
                    a.shortlisted && (
                      <button className="btn bg-vr-600 px-2.5 py-1 text-xs text-white hover:bg-vr-700" disabled={pending} onClick={() => promote(a.id)}>
                        Promote to recommendation →
                      </button>
                    )
                  )}
                  <button className="btn border border-ink-200 px-2 py-1 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={() => toggleShortlist(a)}>
                    {a.shortlisted ? "Unshortlist" : "Shortlist"}
                  </button>
                  <button className="btn border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100" onClick={() => beginEdit(a)}>Edit</button>
                  <button className="btn px-2 py-1 text-xs text-red-500 hover:bg-red-50" disabled={pending} onClick={() => remove(a.id)}>✕</button>
                </div>
              )}
            </div>
          );
        })}
        {alternatives.length === 0 && <p className="text-sm text-ink-500">No alternatives generated yet.{canEdit ? " Add ideas during the Creative phase." : ""}</p>}
      </div>
    </div>
  );
}
