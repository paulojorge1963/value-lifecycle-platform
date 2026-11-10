"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setStudyPhaseStatus, setRecommendationStatus, handoverToRealization, setStudyStatus, type SettableStudyStatus } from "@/lib/actions";

// Study statuses an editor can set inline. HANDED_OVER is driven by handover and
// ARCHIVED by the Archive button, so neither appears here.
const STUDY_STATUS_OPTIONS: { value: SettableStudyStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

// Inline status selector beside the StatusBadge. Hidden once a study is handed
// over or archived — those states are governed by their own flows.
export function StudyStatusControl({ studyId, status, canEdit }: { studyId: string; status: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!canEdit || !STUDY_STATUS_OPTIONS.some((o) => o.value === status)) return null;
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-ink-500">
      <span className="sr-only">Study status</span>
      <select
        aria-label="Study status"
        className="rounded-md border border-ink-300 bg-white px-2 py-1 text-xs text-ink-700 disabled:opacity-50"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as SettableStudyStatus;
          if (next === status) return;
          start(async () => {
            await setStudyStatus(studyId, next);
            router.refresh();
          });
        }}
      >
        {STUDY_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {pending && <span className="text-ink-400">…</span>}
    </label>
  );
}

const NEXT_STATUS: Record<string, { label: string; value: string; cls: string }> = {
  NOT_STARTED: { label: "Start phase", value: "IN_PROGRESS", cls: "btn-ve" },
  IN_PROGRESS: { label: "Mark complete", value: "COMPLETE", cls: "btn-vr" },
  COMPLETE: { label: "Reopen", value: "IN_PROGRESS", cls: "btn-ghost" },
  BLOCKED: { label: "Unblock", value: "IN_PROGRESS", cls: "btn-ghost" },
};

export function PhaseStatusControl({ studyId, phase, status, canEdit }: { studyId: string; phase: string; status: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const next = NEXT_STATUS[status];
  if (!canEdit || !next) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className={next.cls}
        disabled={pending}
        onClick={() => {
          setBlocked(null);
          start(async () => {
            const r = await setStudyPhaseStatus(studyId, phase, next.value);
            if (r && !r.ok) setBlocked(r.unmet);
          });
        }}
      >
        {pending ? "…" : next.label}
      </button>
      {blocked && blocked.length > 0 && (
        <div className="max-w-xs rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left text-[11px] text-amber-800">
          <b>Can’t complete yet</b> — tick these exit criteria first:
          <ul className="mt-1 list-disc pl-4">{blocked.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export function RecommendationStatusControl({ id, studyId, status, canDecide }: { id: string; studyId: string; status: string; canDecide: boolean }) {
  const [pending, start] = useTransition();
  if (!canDecide) return null;
  return (
    <div className="flex gap-1.5">
      <button
        className="btn bg-vr-600 px-2.5 py-1 text-xs text-white hover:bg-vr-700 disabled:opacity-50"
        disabled={pending || status === "ACCEPTED"}
        onClick={() => start(() => setRecommendationStatus(id, studyId, "ACCEPTED"))}
      >
        Accept
      </button>
      <button
        className="btn border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100 disabled:opacity-50"
        disabled={pending || status === "REJECTED"}
        onClick={() => start(() => setRecommendationStatus(id, studyId, "REJECTED"))}
      >
        Reject
      </button>
    </div>
  );
}

export function HandoverButton({ studyId, canHandover, existingTrackId }: { studyId: string; canHandover: boolean; existingTrackId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (existingTrackId) {
    return (
      <button className="btn-vr" onClick={() => router.push(`/vr/${existingTrackId}`)}>
        Open Value Realisation track →
      </button>
    );
  }
  if (!canHandover) return <span className="text-xs text-ink-400">Only a VE / VRM can create the handover.</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn-vr"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            try {
              const trackId = await handoverToRealization(studyId);
              router.push(`/vr/${trackId}`);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Handover failed");
            }
          })
        }
      >
        {pending ? "Creating track…" : "Create Value Realisation Track →"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
