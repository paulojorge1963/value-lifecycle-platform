import { fmtDate } from "@/lib/finance";

export type ActivityItem = {
  id: string;
  action: string;
  actor: string | null;
  at: Date | string;
  meta?: Record<string, unknown> | null;
};

function humanize(action: string): string {
  const s = action.replace(/[._]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function metaSummary(meta?: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  for (const k of ["phase", "stage", "status", "health", "code"]) {
    const v = meta[k];
    if (v != null && v !== "") parts.push(String(v).toLowerCase().replace(/_/g, " "));
  }
  return parts.length ? parts.join(" · ") : null;
}

// Immutable audit trail surfaced on a record (borrowed from the SN Edition).
export function ActivityFeed({ events }: { events: ActivityItem[] }) {
  return (
    <div className="card card-pad">
      <div className="mb-3 flex items-center justify-between">
        <div className="label">Activity</div>
        <span className="text-[11px] text-ink-400">audit trail</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-ink-400">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {events.map((e) => {
            const meta = metaSummary(e.meta);
            return (
              <li key={e.id} className="flex gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-bmc-500" aria-hidden />
                <div className="min-w-0">
                  <div className="text-[13px] text-ink-800">
                    {humanize(e.action)}
                    {meta && <span className="text-ink-500"> — {meta}</span>}
                  </div>
                  <div className="text-[11px] text-ink-400">
                    {e.actor ?? "system"} · {fmtDate(e.at)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
