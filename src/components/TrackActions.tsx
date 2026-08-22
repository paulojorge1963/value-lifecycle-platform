"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveTrack, unarchiveTrack, deleteTrack } from "@/lib/actions";

// Archive (reversible, any track editor) + hard Delete (admin only, typed confirm).
export function TrackActions({
  trackId,
  code,
  status,
  canDelete,
}: {
  trackId: string;
  code: string;
  status: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDel, setConfirmDel] = useState(false);
  const [typed, setTyped] = useState("");
  const isArchived = status === "ARCHIVED";

  function toggleArchive() {
    start(async () => {
      await (isArchived ? unarchiveTrack(trackId) : archiveTrack(trackId));
      router.refresh();
    });
  }
  function doDelete() {
    start(async () => {
      await deleteTrack(trackId);
      router.push("/vr");
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
            <h3 className="text-lg font-semibold text-ink-900">Delete track {code}?</h3>
            <p className="text-sm text-ink-600">
              This permanently deletes the realization track and everything in it — work packages, the adoption plan,
              KPI targets &amp; actuals, benefits, risks, reports and lessons. This cannot be undone.
            </p>
            <p className="rounded-lg bg-ink-50 p-2 text-sm text-ink-600">
              The source VE study (if any) is not affected.
            </p>
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
