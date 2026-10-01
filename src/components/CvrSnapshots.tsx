"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCvrSnapshot } from "@/lib/actions";
import { fmtDate } from "@/lib/finance";

interface CvrSnapshotMeta {
  customerName?: string;
  roiPct?: string;
  paybackMonths?: string;
  npv?: string;
}

interface SnapshotDTO {
  id: string;
  version: number;
  authorName: string;
  createdAt: string;
  meta: CvrSnapshotMeta;
}

export function CvrSnapshots({
  studyId,
  snapshots,
  canEdit,
}: {
  studyId: string;
  snapshots: SnapshotDTO[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    start(async () => {
      try {
        await saveCvrSnapshot(studyId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to save CVR snapshot");
      }
    });
  }

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900">CVR snapshots</h2>
          <span className="text-xs text-ink-400">point-in-time versions of the review deck</span>
        </div>
        {canEdit && <button className="btn-ve" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save snapshot"}</button>}
      </div>

      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      <div className="space-y-2">
        {snapshots.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="badge bg-ink-900 text-white">v{s.version}</span>
                <span className="truncate text-sm text-ink-700">{s.authorName}</span>
                <span className="shrink-0 text-xs text-ink-400">{fmtDate(s.createdAt)}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-ink-500">
                {[s.meta.customerName, s.meta.roiPct && `ROI ${s.meta.roiPct}`, s.meta.paybackMonths && `payback ${s.meta.paybackMonths}`, s.meta.npv && `NPV ${s.meta.npv}`].filter(Boolean).join(" · ") || "snapshot"}
              </div>
            </div>
            <a href={`/api/export/cvr/version/${s.id}`} className="btn border border-ink-200 px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100 shrink-0">Download ↓</a>
          </div>
        ))}
        {snapshots.length === 0 && (
          <p className="text-sm text-ink-500">No snapshots yet.{canEdit ? " Click “Save snapshot” to freeze the current CVR; the live “Export CVR” button always reflects the latest data." : ""}</p>
        )}
      </div>
    </div>
  );
}
