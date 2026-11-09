import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { PrintButton } from "@/components/PrintButton";
import { fmtMoney, fmtPct, DEFAULT_CURRENCY } from "@/lib/finance";
import { gatherLifecycle } from "@/lib/export/lifecycle-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Value Lifecycle Status Report" };

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function Pillar({ eyebrow, title, accent, headline, sub, count, lines }: {
  eyebrow: string; title: string; accent: "ve" | "vr"; headline: string; sub: string; count: string; lines: string[];
}) {
  const bar = accent === "ve" ? "bg-ve-500" : "bg-vr-500";
  const text = accent === "ve" ? "text-ve-600" : "text-vr-600";
  return (
    <div className="card overflow-hidden">
      <div className={`h-1.5 ${bar}`} />
      <div className="p-5">
        <div className={`text-xs font-semibold uppercase tracking-wide ${text}`}>{eyebrow}</div>
        <div className="mt-0.5 text-lg font-semibold text-ink-900">{title}</div>
        <div className={`mt-3 text-3xl font-bold ${text}`}>{headline}</div>
        <div className="mt-0.5 text-xs text-ink-400">{sub}</div>
        <div className="mt-2 text-sm font-medium text-ink-700">{count}</div>
        <ul className="mt-3 space-y-1 text-sm text-ink-500">
          {lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-ink-300">·</span>{l}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default async function LifecycleStatusReportPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const d = await gatherLifecycle(user.organizationId);
  const cur = d.reportCurrency || DEFAULT_CURRENCY;
  const realisedPct = d.vr.plannedInTracks > 0 ? (d.vr.realized / d.vr.plannedInTracks) * 100 : null;

  const narrative = `Of ${fmtMoney(d.ve.planned, cur)} in value promised across ${d.ve.total} Value Engineering stud${d.ve.total === 1 ? "y" : "ies"}, ${fmtMoney(d.vr.realized, cur)} has been proven in realisation${realisedPct != null ? ` (${fmtPct(realisedPct)} of the plan in flight)` : ""}, and ${fmtMoney(d.cs.arr, cur)} of ARR is being sustained across ${d.cs.total} Customer Success engagement${d.cs.total === 1 ? "" : "s"}.`;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/portfolio" className="text-sm text-ink-500 hover:underline">← Value Portfolio</Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">Value Lifecycle — Executive Status Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton className="btn-ghost" />
          <a href="/api/export/lifecycle-status/pptx" className="btn-ghost">PPTX ↓</a>
          <a href="/api/export/lifecycle-status" className="btn-ve">Download (Word) ↓</a>
        </div>
      </div>

      <div className="space-y-6">
        <div className="border-b border-ink-100 pb-4">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Value Lifecycle · Executive status report</div>
          <h2 className="mt-1 text-2xl font-semibold text-ink-900">{d.orgName || "Value Lifecycle"}</h2>
          <p className="mt-1 text-sm text-ink-400">The value thread — engineered, realised, sustained · generated {fmtDate(new Date())}</p>
        </div>

        <div className="card bg-ink-50/50 p-5">
          <div className="text-sm font-semibold text-ink-900">The value thread</div>
          <p className="mt-1 text-sm text-ink-600">{narrative}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Pillar
            eyebrow="Value Engineering · Promised" title="Value we engineer" accent="ve"
            headline={fmtMoney(d.ve.planned, cur)} sub="value promised"
            count={`${d.ve.total} stud${d.ve.total === 1 ? "y" : "ies"}`}
            lines={[`${d.ve.active} active`, `${d.ve.approved} approved`, `${d.ve.atGate} at the decision gate`]}
          />
          <Pillar
            eyebrow="Value Realisation · Proven" title="Value we prove" accent="vr"
            headline={fmtMoney(d.vr.realized, cur)} sub={`of ${fmtMoney(d.vr.plannedInTracks, cur)} planned${realisedPct != null ? ` (${fmtPct(realisedPct)})` : ""}`}
            count={`${d.vr.total} track${d.vr.total === 1 ? "" : "s"}`}
            lines={[`${d.vr.inFlight} in flight`, `${d.vr.health.GREEN} green · ${d.vr.health.AMBER} amber · ${d.vr.health.RED} red`, `${d.vr.atRisk} at risk`]}
          />
          <Pillar
            eyebrow="Customer Success · Sustained" title="Value we sustain" accent="vr"
            headline={fmtMoney(d.cs.arr, cur)} sub="ARR under management"
            count={`${d.cs.total} engagement${d.cs.total === 1 ? "" : "s"}`}
            lines={[`${d.cs.health.GREEN} green · ${d.cs.health.AMBER} amber · ${d.cs.health.RED} red`, `${d.cs.atRisk} at risk`, `${d.cs.renewalsDue} renewal${d.cs.renewalsDue === 1 ? "" : "s"} due within 90 days`]}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">Attention across the lifecycle</div>
          {d.attention.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">Nothing flagged across the three pillars.</div>
          ) : (
            <ul className="divide-y divide-ink-50">
              {d.attention.map((a, i) => (
                <li key={i} className="px-4 py-2.5 text-sm text-ink-700">{a}</li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-ink-400">
          Values roll up in {cur}; mixed-currency workspaces are shown at the prevailing study currency. Open each pillar&apos;s own status report (VE · VR · CS) for the full breakdown.
        </p>
      </div>
    </div>
  );
}
