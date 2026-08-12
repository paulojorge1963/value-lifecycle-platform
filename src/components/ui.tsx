import Link from "next/link";
import { fmtMoney } from "@/lib/finance";

// ---- Status colour maps ----------------------------------------------------
const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  ACTIVE: "bg-ve-100 text-ve-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-vr-100 text-vr-700",
  REJECTED: "bg-red-100 text-red-700",
  HANDED_OVER: "bg-vr-100 text-vr-700",
  ARCHIVED: "bg-ink-100 text-ink-500",
  PLANNING: "bg-ink-100 text-ink-600",
  IN_FLIGHT: "bg-ve-100 text-ve-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  REALIZED: "bg-vr-100 text-vr-700",
  CLOSED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-red-100 text-red-700",
  NOT_STARTED: "bg-ink-100 text-ink-500",
  IN_PROGRESS: "bg-ve-100 text-ve-700",
  BLOCKED: "bg-red-100 text-red-700",
  COMPLETE: "bg-vr-100 text-vr-700",
  DONE: "bg-vr-100 text-vr-700",
  PROPOSED: "bg-ink-100 text-ink-600",
  SHORTLISTED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-vr-100 text-vr-700",
  DEFERRED: "bg-ink-100 text-ink-500",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? "bg-ink-100 text-ink-600";
  return <span className={`badge ${cls}`}>{status.replaceAll("_", " ").toLowerCase()}</span>;
}

const HEALTH_STYLE: Record<string, string> = {
  GREEN: "bg-vr-500",
  AMBER: "bg-amber-500",
  RED: "bg-red-500",
};

export function HealthPill({ health }: { health: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
      <span className={`h-2.5 w-2.5 rounded-full ${HEALTH_STYLE[health] ?? "bg-ink-300"}`} />
      {health.toLowerCase()}
    </span>
  );
}

// ---- Stat tile -------------------------------------------------------------
export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ve" | "vr" | "ink";
}) {
  const bar = accent === "ve" ? "bg-ve-500" : accent === "vr" ? "bg-vr-500" : "bg-ink-400";
  return (
    <div className="card card-pad">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${bar}`} />
        <span className="label">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

export function Money({ value, currency }: { value: number | null | undefined; currency?: string }) {
  return <span>{fmtMoney(value ?? null, currency)}</span>;
}

// ---- Section header --------------------------------------------------------
export function SectionHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-ink-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- Phase stepper ---------------------------------------------------------
export function PhaseStepper({
  phases,
  accent,
}: {
  phases: { key: string; title: string; order: number; status: string }[];
  accent: "ve" | "vr";
}) {
  const dotDone = accent === "ve" ? "bg-ve-600" : "bg-vr-600";
  return (
    <ol className="flex flex-wrap gap-2">
      {phases
        .sort((a, b) => a.order - b.order)
        .map((p) => {
          const done = p.status === "COMPLETE";
          const active = p.status === "IN_PROGRESS";
          return (
            <li
              key={p.key}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                done
                  ? "border-transparent " + (accent === "ve" ? "bg-ve-50 text-ve-700" : "bg-vr-50 text-vr-700")
                  : active
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-ink-200 bg-white text-ink-500"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${
                  done ? dotDone : active ? "bg-amber-500" : "bg-ink-300"
                }`}
              >
                {p.order}
              </span>
              {p.title}
            </li>
          );
        })}
    </ol>
  );
}

// ---- Progress bar ----------------------------------------------------------
export function ProgressBar({ pct, accent }: { pct: number; accent?: "ve" | "vr" }) {
  const bar = accent === "vr" ? "bg-vr-500" : "bg-ve-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

export function LinkCard({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="card block transition-shadow hover:shadow-md">
      {children}
    </Link>
  );
}
