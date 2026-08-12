"use client";

import { useState, useTransition } from "react";
import { setTrackPhaseStatus, setWorkPackageStatus, recordKpiActual, updateBenefitRealized } from "@/lib/actions";

const WP_NEXT: Record<string, { label: string; value: string }> = {
  NOT_STARTED: { label: "Start", value: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Done", value: "DONE" },
  BLOCKED: { label: "Resume", value: "IN_PROGRESS" },
  DONE: { label: "Reopen", value: "IN_PROGRESS" },
};

export function TrackPhaseControl({ trackId, phase, status, canEdit }: { trackId: string; phase: string; status: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const map: Record<string, { label: string; value: string; cls: string }> = {
    NOT_STARTED: { label: "Start phase", value: "IN_PROGRESS", cls: "btn-vr" },
    IN_PROGRESS: { label: "Mark complete", value: "COMPLETE", cls: "btn-vr" },
    COMPLETE: { label: "Reopen", value: "IN_PROGRESS", cls: "btn-ghost" },
    BLOCKED: { label: "Unblock", value: "IN_PROGRESS", cls: "btn-ghost" },
  };
  const next = map[status];
  if (!canEdit || !next) return null;
  return (
    <button className={next.cls} disabled={pending} onClick={() => start(() => setTrackPhaseStatus(trackId, phase, next.value))}>
      {pending ? "…" : next.label}
    </button>
  );
}

export function WorkPackageControl({ id, trackId, status, canEdit }: { id: string; trackId: string; status: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const next = WP_NEXT[status];
  if (!canEdit || !next) return null;
  return (
    <button
      className="btn border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100"
      disabled={pending}
      onClick={() => start(() => setWorkPackageStatus(id, trackId, next.value))}
    >
      {pending ? "…" : next.label}
    </button>
  );
}

export function KpiActualForm({ trackId, kpiTargetId, unit, canEdit }: { trackId: string; kpiTargetId: string; unit: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  if (!canEdit) return null;
  return (
    <form
      className="flex items-center gap-1.5"
      action={(fd) => {
        fd.set("kpiTargetId", kpiTargetId);
        start(() => recordKpiActual(trackId, fd));
      }}
    >
      <input name="periodLabel" placeholder="2026-Q4" className="w-24 rounded border border-ink-300 px-2 py-1 text-xs" required />
      <input name="value" type="number" step="any" placeholder={unit} className="w-24 rounded border border-ink-300 px-2 py-1 text-xs" required />
      <button className="btn bg-vr-600 px-2.5 py-1 text-xs text-white hover:bg-vr-700" disabled={pending}>
        {pending ? "…" : "Record"}
      </button>
    </form>
  );
}

export function BenefitInput({ id, trackId, planned, realized, canEdit }: { id: string; trackId: string; planned: number; realized: number; canEdit: boolean }) {
  const [val, setVal] = useState(realized);
  const [pending, start] = useTransition();
  const pct = planned > 0 ? Math.min(100, (val / planned) * 100) : 0;
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full bg-vr-500" style={{ width: `${pct}%` }} />
      </div>
      {canEdit && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            className="w-28 rounded border border-ink-300 px-2 py-1 text-xs"
          />
          <button
            className="btn bg-vr-600 px-2 py-1 text-xs text-white hover:bg-vr-700"
            disabled={pending || val === realized}
            onClick={() => start(() => updateBenefitRealized(id, trackId, val))}
          >
            {pending ? "…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
