"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { updateEvaluationCriteria, saveAlternativeScores, updateAlternative } from "@/lib/actions";
import { weightedScore, criterionKey, SCORE_MIN, SCORE_MAX, DEFAULT_CRITERIA, type Criterion } from "@/lib/evaluation";

interface Alt {
  id: string;
  idea: string;
  scores: Record<string, number> | null;
  weightedScore: number | null;
  shortlisted: boolean;
}

type ScoreMap = Record<string, Record<string, string>>; // altId -> critKey -> input string

export function EvaluationMatrix({
  studyId,
  criteria: initialCriteria,
  alternatives,
  canEdit,
}: {
  studyId: string;
  criteria: Criterion[];
  alternatives: Alt[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
  const [criteriaDirty, setCriteriaDirty] = useState(false);
  const [scores, setScores] = useState<ScoreMap>(() => {
    const m: ScoreMap = {};
    for (const a of alternatives) {
      m[a.id] = {};
      for (const [k, v] of Object.entries(a.scores ?? {})) m[a.id][k] = String(v);
    }
    return m;
  });
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Stable rank order from persisted weighted scores (avoids reordering while typing).
  const ranked = useMemo(() => {
    return [...alternatives].sort((a, b) => (b.weightedScore ?? -1) - (a.weightedScore ?? -1));
  }, [alternatives]);

  function parseScores(altId: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(scores[altId] ?? {})) {
      if (v.trim() !== "" && !Number.isNaN(Number(v))) out[k] = Number(v);
    }
    return out;
  }
  const preview = (altId: string) => weightedScore(parseScores(altId), criteria);

  function setCell(altId: string, key: string, value: string) {
    setScores((prev) => ({ ...prev, [altId]: { ...(prev[altId] ?? {}), [key]: value } }));
  }

  // --- criteria editing ---
  function addCriterion() {
    setCriteria((c) => [...c, { key: criterionKey("criterion"), label: "New criterion", weight: 1 }]);
    setCriteriaDirty(true);
  }
  function editCriterion(key: string, patch: Partial<Criterion>) {
    setCriteria((c) => c.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    setCriteriaDirty(true);
  }
  function removeCriterion(key: string) {
    setCriteria((c) => c.filter((x) => x.key !== key));
    setCriteriaDirty(true);
  }
  function loadDefaults() {
    setCriteria(DEFAULT_CRITERIA.map((c) => ({ ...c })));
    setCriteriaDirty(true);
  }
  function saveCriteria() {
    start(async () => {
      try {
        await updateEvaluationCriteria(studyId, criteria);
        setCriteriaDirty(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  // --- scoring ---
  function saveRow(altId: string) {
    start(async () => {
      try {
        await saveAlternativeScores(altId, studyId, parseScores(altId));
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    });
  }
  function toggleShortlist(a: Alt) {
    start(async () => {
      await updateAlternative(a.id, studyId, { shortlisted: !a.shortlisted });
      router.refresh();
    });
  }

  const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900">Evaluation matrix</h2>
          <span className="text-xs text-ink-400">score {SCORE_MIN}–{SCORE_MAX} per criterion · weighted &amp; ranked</span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={pending} onClick={addCriterion}>+ Criterion</button>
            <button className={criteriaDirty ? "btn-ve" : "btn-ghost"} disabled={pending || !criteriaDirty} onClick={saveCriteria}>
              {pending ? "Saving…" : "Save criteria"}
            </button>
          </div>
        )}
      </div>

      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      {/* Criteria editor */}
      {criteria.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-300 p-4 text-sm text-ink-500">
          No evaluation criteria yet.{" "}
          {canEdit && (
            <button className="font-medium text-ve-700 hover:underline" onClick={() => { loadDefaults(); }}>
              Load a default set
            </button>
          )}
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {criteria.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-2 py-1.5">
              {canEdit ? (
                <>
                  <input
                    value={c.label}
                    onChange={(e) => editCriterion(c.key, { label: e.target.value })}
                    className="w-28 rounded border border-ink-300 bg-white px-1.5 py-0.5 text-xs"
                  />
                  <span className="text-xs text-ink-400">w</span>
                  <input
                    type="number"
                    value={c.weight}
                    min={0}
                    onChange={(e) => editCriterion(c.key, { weight: Number(e.target.value) })}
                    className="w-12 rounded border border-ink-300 bg-white px-1.5 py-0.5 text-xs"
                  />
                  <button className="text-xs text-red-500 hover:text-red-700" onClick={() => removeCriterion(c.key)}>✕</button>
                </>
              ) : (
                <span className="text-xs font-medium text-ink-700">{c.label} <span className="text-ink-400">·w{c.weight}</span></span>
              )}
            </div>
          ))}
          {criteriaDirty && <span className="self-center text-xs text-amber-600">unsaved — click “Save criteria”</span>}
        </div>
      )}

      {/* Scoring grid */}
      {alternatives.length === 0 ? (
        <p className="text-sm text-ink-500">No alternatives to score yet — add creative alternatives first.</p>
      ) : criteria.length === 0 ? null : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-ink-200">
              <tr>
                <th className="th w-8">#</th>
                <th className="th">Alternative</th>
                {criteria.map((c) => (
                  <th key={c.key} className="th text-center" title={`weight ${c.weight}`}>
                    {c.label}<span className="ml-0.5 font-normal text-ink-400">·{c.weight}</span>
                  </th>
                ))}
                <th className="th text-right">Weighted</th>
                <th className="th text-center">Shortlist</th>
                {canEdit && <th className="th"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ranked.map((a, i) => {
                const ws = preview(a.id);
                const isTop = i === 0 && ws != null;
                return (
                  <tr key={a.id} className={a.shortlisted ? "bg-amber-50/50" : ""}>
                    <td className="td">
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${isTop ? "bg-ve-600 text-white" : "bg-ink-100 text-ink-500"}`}>
                        {a.weightedScore != null ? i + 1 : "—"}
                      </span>
                    </td>
                    <td className="td font-medium">{a.idea || <span className="text-ink-400">Untitled idea</span>}</td>
                    {criteria.map((c) => (
                      <td key={c.key} className="td text-center">
                        {canEdit ? (
                          <input
                            type="number"
                            min={SCORE_MIN}
                            max={SCORE_MAX}
                            value={scores[a.id]?.[c.key] ?? ""}
                            onChange={(e) => setCell(a.id, c.key, e.target.value)}
                            className="w-14 rounded border border-ink-300 px-1.5 py-1 text-center text-sm"
                          />
                        ) : (
                          <span className="text-sm text-ink-700">{a.scores?.[c.key] ?? "—"}</span>
                        )}
                      </td>
                    ))}
                    <td className="td text-right">
                      <span className={`text-sm font-semibold ${ws != null ? "text-ve-700" : "text-ink-400"}`}>
                        {ws != null ? ws.toFixed(2) : "—"}
                      </span>
                    </td>
                    <td className="td text-center">
                      <button
                        disabled={!canEdit || pending}
                        onClick={() => toggleShortlist(a)}
                        className={`badge ${a.shortlisted ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"} ${canEdit ? "cursor-pointer hover:opacity-80" : ""}`}
                      >
                        {a.shortlisted ? "shortlisted" : "shortlist"}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="td text-right">
                        <button className="btn bg-ve-600 px-2.5 py-1 text-xs text-white hover:bg-ve-700" disabled={pending} onClick={() => saveRow(a.id)}>
                          {pending ? "…" : "Save"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink-200">
                <td className="td"></td>
                <td className="td text-xs text-ink-400">Σ weights = {totalWeight}</td>
                <td className="td text-xs text-ink-400" colSpan={criteria.length}>Weighted = Σ(score×weight) ÷ Σweights</td>
                <td className="td"></td>
                <td className="td"></td>
                {canEdit && <td className="td"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
