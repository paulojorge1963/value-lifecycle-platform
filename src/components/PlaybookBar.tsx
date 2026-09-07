import Link from "next/link";

// SN-style playbook: a connected phase tracker across the top of a record.
// Works for VE studies, VR tracks and CS engagements — pass generic phases.
type Status = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETE";
export type PlaybookPhase = { key: string; name: string; order: number; status: Status };

const DOT: Record<Status, string> = {
  NOT_STARTED: "bg-ink-300",
  IN_PROGRESS: "bg-blue-600",
  BLOCKED: "bg-red-600",
  COMPLETE: "bg-emerald-600",
};
const TEXT: Record<Status, string> = {
  NOT_STARTED: "text-ink-400",
  IN_PROGRESS: "text-blue-700",
  BLOCKED: "text-red-700",
  COMPLETE: "text-emerald-700",
};
const LABEL: Record<Status, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  COMPLETE: "Complete",
};

export function PlaybookBar({
  title,
  phases,
  activeKey,
  currentKey,
  basePath,
  param = "phase",
}: {
  title: string;
  phases: PlaybookPhase[];
  activeKey: string;
  currentKey?: string;
  basePath: string;
  param?: string;
}) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const complete = sorted.filter((p) => p.status === "COMPLETE").length;

  return (
    <div className="card card-pad">
      <div className="mb-2 flex items-center justify-between">
        <div className="label">{title}</div>
        <div className="text-xs text-ink-400">{complete} / {sorted.length} phases complete</div>
      </div>
      <ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {sorted.map((p, i) => {
          const active = p.key === activeKey;
          const isCurrent = p.key === (currentKey ?? activeKey);
          const done = p.status === "COMPLETE";
          return (
            <li key={p.key} className="flex min-w-[132px] flex-1 items-center">
              <Link
                href={`${basePath}?${param}=${p.key}`}
                aria-current={active ? "page" : undefined}
                className={`group flex w-full flex-col gap-1 rounded-lg border px-3 py-2 transition-colors ${
                  active ? "border-bmc-500 bg-bmc-50 ring-1 ring-bmc-500" : "border-ink-200 bg-white hover:bg-ink-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white ${DOT[p.status]}`}>
                    {done ? "✓" : p.order}
                  </span>
                  <span className="truncate text-xs font-medium text-ink-900">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-7">
                  <span className={`text-[11px] ${TEXT[p.status]}`}>{LABEL[p.status]}</span>
                  {isCurrent && <span className="ml-auto rounded-full bg-bmc-100 px-1.5 text-[10px] font-medium text-bmc-700">current</span>}
                </div>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className={`h-full rounded-full ${DOT[p.status]}`} style={{ width: done ? "100%" : p.status === "IN_PROGRESS" ? "50%" : "0%" }} />
                </div>
              </Link>
              {i < sorted.length - 1 && <div className="mx-0.5 h-px w-2 shrink-0 bg-ink-200" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
