"use client";

import { useTransition } from "react";
import { reassignStudyOwner, reassignTrackOwner } from "@/lib/actions";
import { reassignEngagementOwner } from "@/lib/cs-actions";

type Kind = "study" | "track" | "engagement";
const LABEL: Record<Kind, string> = { study: "Owner", track: "Owner", engagement: "CSM" };

// Inline owner picker for a VE study / VR track / CS engagement. Shows plain
// text when the viewer can't edit; otherwise a select of eligible owners that
// reassigns on change (mirrors CsHealthControl / TrackPhaseControl).
export function OwnerControl({
  kind, entityId, currentOwnerId, options, canEdit,
}: {
  kind: Kind;
  entityId: string;
  currentOwnerId: string;
  options: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const current = options.find((o) => o.id === currentOwnerId);

  if (!canEdit) return <span>· {LABEL[kind]} {current?.name ?? "—"}</span>;

  const run = (ownerId: string) => {
    if (ownerId === currentOwnerId) return;
    start(() => {
      if (kind === "engagement") reassignEngagementOwner(entityId, ownerId);
      else if (kind === "track") reassignTrackOwner(entityId, ownerId);
      else reassignStudyOwner(entityId, ownerId);
    });
  };

  return (
    <span className="inline-flex items-center gap-1">
      · {LABEL[kind]}
      <select
        className="rounded-lg border border-ink-300 px-1.5 py-0.5 text-xs"
        defaultValue={currentOwnerId}
        disabled={pending}
        onChange={(e) => run(e.target.value)}
        title="Reassign owner"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </span>
  );
}
