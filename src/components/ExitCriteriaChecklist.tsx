"use client";

import { useTransition } from "react";
import { setStudyPhaseChecklist, setTrackPhaseChecklist } from "@/lib/actions";
import { setEngagementStageChecklist } from "@/lib/cs-actions";
import type { GateKind } from "@/lib/gates";

// Interactive exit-criteria checklist. Ticking these is what the completeness
// gate checks before a phase/stage can be marked complete.
export function ExitCriteriaChecklist({
  kind,
  id,
  phaseKey,
  criteria,
  checklist,
  canEdit,
}: {
  kind: GateKind;
  id: string;
  phaseKey: string;
  criteria: string[];
  checklist?: Record<string, boolean> | null;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const cl = checklist ?? {};
  const met = criteria.filter((_, i) => cl[String(i)]).length;
  const all = criteria.length > 0 && met === criteria.length;

  const toggle = (index: number, done: boolean) => {
    if (!canEdit) return;
    start(() => {
      if (kind === "VE") return void setStudyPhaseChecklist(id, phaseKey, index, done);
      if (kind === "VR") return void setTrackPhaseChecklist(id, phaseKey, index, done);
      return void setEngagementStageChecklist(id, phaseKey, index, done);
    });
  };

  return (
    <div className="rounded-lg bg-ink-50 p-4">
      <div className="flex items-center justify-between">
        <div className="label">Exit criteria (gate to advance)</div>
        <span className={`text-xs font-medium ${all ? "text-emerald-700" : "text-ink-500"}`}>{met} / {criteria.length} met</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {criteria.map((c, i) => {
          const done = !!cl[String(i)];
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <button
                type="button"
                onClick={() => toggle(i, !done)}
                disabled={!canEdit || pending}
                aria-pressed={done}
                aria-label={done ? "Mark not met" : "Mark met"}
                className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded border text-[11px] transition ${
                  done ? "border-emerald-600 bg-emerald-600 text-white" : "border-ink-300 bg-white hover:border-bmc-500"
                } ${!canEdit ? "cursor-default opacity-70" : ""}`}
              >
                {done ? "✓" : ""}
              </button>
              <span className={done ? "text-ink-500 line-through" : "text-ink-700"}>{c}</span>
            </li>
          );
        })}
        {criteria.length === 0 && <li className="text-sm text-ink-400">No exit criteria defined for this phase.</li>}
      </ul>
      {!all && criteria.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">All criteria must be met before this phase can be marked complete.</p>
      )}
    </div>
  );
}
