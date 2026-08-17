"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveStudy, unarchiveStudy, deleteStudy } from "@/lib/actions";

// Archive (reversible, any editor) + hard Delete (admin only, typed confirm).
export function StudyActions({
  studyId,
  code,
  status,
  canDelete,
}: {
  studyId: string;
  code: string;
  status: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);
  const [typed, setTyped] = useState("");
  const isArchived = status === "ARCHIVED";
  const isHandedOver = status === "HANDED_OVER";

  function toggleArchive() {
    start(async () => {
      await (isArchived ? unarchiveStudy(studyId) : archiveStudy(studyId));
      router.refresh();
    });
  }
  function doDelete() {
    start(async () => {
      await deleteStudy(studyId);
      router.push("/ve");
    });
  }

  return (
    <>
      <button className="btn-ghost" onClick={toggleArchive} disabled={pending}>
        {isArchived ? "Unarchive" : "Archive"}
      </button>
      {canDelete && (
        <button
          className="btn-ghost text-red-600 hover:bg-red-50"
          onClick={() => { setTyped(""); setConfirmDel(true); }}
          disabled={pending}
        >
          Delete
        </button>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4" onClick={() => setConfirmDel(false)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 text-left shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ink-900">Delete study {code}?</h3>
            <p className="text-sm text-ink-600">
              This permanently deletes the study and everything in it — functions, recommendations, the business case,
              handover artifacts and KPIs. This cannot be undone.
            </p>
            {isHandedOver && (
              <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-700">
                This study was handed over. Its realization track stays, but loses its link back to this study.
              </p>
            )}
            <div>
              <label className="label">
                Type <span className="font-mono font-semibold">{code}</span> to confirm
              </label>
              <input className="input mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost" onClick={() => setConfirmDel(false)} disabled={pending}>Cancel</button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={typed.trim() !== code || pending}
                onClick={doDelete}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
