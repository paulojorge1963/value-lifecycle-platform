"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setEngagementStageStatus, updateEngagementHealth,
  linkTrackToEngagement, linkStudyToEngagement, unlinkTrack, unlinkStudy,
} from "@/lib/cs-actions";

export function CsStageControl({ engagementId, stage, status, canEdit }: { engagementId: string; stage: string; status: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const map: Record<string, { label: string; value: string; cls: string }> = {
    NOT_STARTED: { label: "Start stage", value: "IN_PROGRESS", cls: "btn-vr" },
    IN_PROGRESS: { label: "Mark complete", value: "COMPLETE", cls: "btn-vr" },
    COMPLETE: { label: "Reopen", value: "IN_PROGRESS", cls: "btn-ghost" },
    BLOCKED: { label: "Unblock", value: "IN_PROGRESS", cls: "btn-ghost" },
  };
  const next = map[status];
  if (!canEdit || !next) return null;
  return (
    <button className={next.cls} disabled={pending} onClick={() => start(() => setEngagementStageStatus(engagementId, stage, next.value))}>
      {pending ? "…" : next.label}
    </button>
  );
}

export function CsHealthControl({ engagementId, health, canEdit }: { engagementId: string; health: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  if (!canEdit) return null;
  return (
    <select
      className="rounded-lg border border-ink-300 px-2 py-1 text-xs"
      defaultValue={health}
      disabled={pending}
      onChange={(e) => start(() => updateEngagementHealth(engagementId, e.target.value))}
    >
      <option value="GREEN">Health: Green</option>
      <option value="AMBER">Health: Amber</option>
      <option value="RED">Health: Red</option>
    </select>
  );
}

export function LinkPicker({
  engagementId, kind, options, canEdit,
}: {
  engagementId: string;
  kind: "track" | "study";
  options: { id: string; label: string }[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [sel, setSel] = useState("");
  const router = useRouter();
  if (!canEdit || options.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <select className="input flex-1 text-sm" value={sel} onChange={(e) => setSel(e.target.value)}>
        <option value="">Link an existing {kind === "track" ? "VR track" : "VE study"}…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <button
        className="btn-vr"
        disabled={pending || !sel}
        onClick={() => start(async () => {
          await (kind === "track" ? linkTrackToEngagement(engagementId, sel) : linkStudyToEngagement(engagementId, sel));
          setSel(""); router.refresh();
        })}
      >
        {pending ? "…" : "Link"}
      </button>
    </div>
  );
}

export function UnlinkButton({ engagementId, id, kind }: { engagementId: string; id: string; kind: "track" | "study" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="text-xs text-ink-400 hover:text-red-600"
      disabled={pending}
      onClick={() => start(async () => { await (kind === "track" ? unlinkTrack(engagementId, id) : unlinkStudy(engagementId, id)); router.refresh(); })}
    >
      {pending ? "…" : "unlink"}
    </button>
  );
}
