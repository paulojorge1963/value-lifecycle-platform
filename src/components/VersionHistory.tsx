"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveBusinessCaseVersion, restoreBusinessCaseVersion } from "@/lib/actions";
import { fmtMoney, fmtPct } from "@/lib/finance";

interface Snapshot {
  executiveSummary?: string | null;
  currency?: string;
  roiPct?: number | null;
  paybackMonths?: number | null;
  npv?: number | null;
  scenarios?: unknown[];
  costItems?: unknown[];
}

interface VersionDTO {
  id: string;
  version: number;
  authorName: string;
  createdAt: string;
  snapshot: Snapshot;
}

export function VersionHistory({
  studyId,
  versions,
  canEdit,
}: {
  studyId: string;
  versions: VersionDTO[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    start(async () => {
      try {
        await saveBusinessCaseVersion(studyId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to save version");
      }
    });
  }
  function restore(id: string, v: number) {
    if (!confirm(`Restore the business case to version ${v}? Current scenarios and cost items will be replaced.`)) return;
    start(async () => {
      try {
        await restoreBusinessCaseVersion(id, studyId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to restore");
      }
    });
  }

  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900">Version history</h2>
          <span className="text-xs text-ink-400">snapshots of this business case</span>
        </div>
        {canEdit && <button className="btn-ve" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save version"}</button>}
      </div>

      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}

      <div className="space-y-2">
        {versions.map((v) => {
          const open = openId === v.id;
          const s = v.snapshot ?? {};
          return (
            <div key={v.id} className="rounded-lg border border-ink-200">
              <button
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ink-50"
                onClick={() => setOpenId(open ? null : v.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="badge bg-ink-900 text-white">v{v.version}</span>
                  <span className="text-sm text-ink-700">{v.authorName}</span>
                  <span className="text-xs text-ink-400">{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <span className="text-xs text-ink-400">{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div className="border-t border-ink-100 px-3 py-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field k="ROI" v={fmtPct(s.roiPct ?? null)} />
                    <Field k="Payback" v={s.paybackMonths != null ? `${s.paybackMonths} mo` : "—"} />
                    <Field k="NPV" v={fmtMoney(s.npv ?? null, s.currency)} />
                    <Field k="Currency" v={s.currency ?? "—"} />
                  </div>
                  <div className="mt-2 text-xs text-ink-500">
                    {(s.scenarios?.length ?? 0)} scenarios · {(s.costItems?.length ?? 0)} cost items
                  </div>
                  {s.executiveSummary && <p className="mt-2 text-ink-600">{s.executiveSummary}</p>}
                  {canEdit && (
                    <div className="mt-3">
                      <button className="btn border border-ink-200 px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-100" disabled={pending} onClick={() => restore(v.id, v.version)}>
                        Restore this version
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {versions.length === 0 && <p className="text-sm text-ink-500">No versions saved yet.{canEdit ? " Click “Save version” to snapshot the current business case." : ""}</p>}
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="label">{k}</div>
      <div className="font-medium text-ink-900">{v}</div>
    </div>
  );
}
