"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setStudyPhaseStatus, setRecommendationStatus, handoverToRealization } from "@/lib/actions";

const NEXT_STATUS: Record<string, { label: string; value: string; cls: string }> = {
  NOT_STARTED: { label: "Start phase", value: "IN_PROGRESS", cls: "btn-ve" },
  IN_PROGRESS: { label: "Mark complete", value: "COMPLETE", cls: "btn-vr" },
  COMPLETE: { label: "Reopen", value: "IN_PROGRESS", cls: "btn-ghost" },
  BLOCKED: { label: "Unblock", value: "IN_PROGRESS", cls: "btn-ghost" },
};

export function PhaseStatusControl({ studyId, phase, status, canEdit }: { studyId: string; phase: string; status: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const next = NEXT_STATUS[status];
  if (!canEdit || !next) return null;
  return (
    <button
      className={next.cls}
      disabled={pending}
      onClick={() => start(() => setStudyPhaseStatus(studyId, phase, next.value).then(() => {}))}
    >
      {pending ? "…" : next.label}
    </button>
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
        Open Value Realization track →
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
        {pending ? "Creating track…" : "Create Value Realization Track →"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
