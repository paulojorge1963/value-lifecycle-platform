import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { VE_PHASES } from "@/lib/domain/phases";
import { fmtMoney, fmtPct } from "@/lib/finance";

export const dynamic = "force-dynamic";
export const metadata = { title: "VE Status Report" };

const PHASE_TITLE: Record<string, string> = Object.fromEntries(VE_PHASES.map((p) => [p.key, p.title]));
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", ACTIVE: "Active", IN_REVIEW: "In review", APPROVED: "Approved",
  REJECTED: "Rejected", HANDED_OVER: "Handed over", ARCHIVED: "Archived",
};
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
function studyPhase(st: { status: string; phases: { phase: string; order: number; status: string }[] }) {
  if (st.status === "APPROVED") return "Approved";
  if (st.status === "HANDED_OVER") return "Handed over";
  if (st.status === "REJECTED") return "Rejected";
  const sorted = [...st.phases].sort((a, b) => a.order - b.order);
  const cur = sorted.find((p) => p.status === "IN_PROGRESS") ?? sorted.find((p) => p.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? (PHASE_TITLE[cur.phase] ?? cur.phase) : "—";
}
const payback = (m: number | null | undefined) => (m != null ? `${m.toFixed(1)} mo` : "—");

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-ink-400">{sub}</div> : null}
    </div>
  );
}

export default async function VeStatusReportPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const studies = await prisma.study.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, owner: true, businessCase: true, phases: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  const byStatus: Record<string, number> = {};
  const byCur = new Map<string, { total: number; count: number }>();
  for (const s of studies) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    if (s.estimatedValue && s.estimatedValue > 0) {
      const e = byCur.get(s.currency) ?? { total: 0, count: 0 };
      e.total += s.estimatedValue; e.count += 1;
      byCur.set(s.currency, e);
    }
  }
  const approved = byStatus.APPROVED ?? 0;
  const atGate = byStatus.IN_REVIEW ?? 0;
  const active = byStatus.ACTIVE ?? 0;
  const currencies = [...byCur.entries()];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/ve" className="text-sm text-ve-600 hover:underline">← Value Engineering workspace</Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">Value Engineering — Status Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton className="btn-ghost" />
          <a href="/api/export/ve-status/pptx" className="btn-ghost">PPTX ↓</a>
          <a href="/api/export/ve-status" className="btn-ve">Download (Word) ↓</a>
        </div>
      </div>

      <div className="space-y-6">
        <div className="border-b border-ink-100 pb-4">
          <div className="text-xs font-medium uppercase tracking-wide text-ve-600">Value Engineering · Portfolio status report</div>
          <h2 className="mt-1 text-2xl font-semibold text-ink-900">{orgName || "Value Engineering studies"}</h2>
          <p className="mt-1 text-sm text-ink-400">Pipeline status across all VE studies · generated {fmtDate(new Date())}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Studies" value={String(studies.length)} sub={`${active} active`} />
          <Stat label="Approved" value={String(approved)} sub="business case signed off" />
          <Stat label="At decision gate" value={String(atGate)} sub="in review" />
          <Stat
            label="Pipeline value"
            value={currencies.length === 1 ? fmtMoney(currencies[0][1].total, currencies[0][0]) : currencies.length ? "mixed" : "—"}
            sub={currencies.length === 1 ? `${currencies[0][1].count} studies` : `${currencies.length} currencies`}
          />
        </div>

        {currencies.length > 1 && (
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold text-ink-900">Identified value by currency</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currencies.map(([cur, v]) => (
                <div key={cur} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-700">{cur} <span className="text-ink-400">· {v.count} stud{v.count === 1 ? "y" : "ies"}</span></span>
                    <span className="font-semibold text-ve-600">{fmtMoney(v.total, cur)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">Studies ({studies.length})</div>
          {studies.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">No Value Engineering studies yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-4 py-2 font-medium">Study</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Phase</th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                    <th className="px-3 py-2 text-center font-medium">ROI</th>
                    <th className="px-3 py-2 text-center font-medium">Payback</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((s) => (
                    <tr key={s.id} className="border-b border-ink-50 align-top">
                      <td className="px-4 py-3">
                        <Link href={`/ve/${s.id}`} className="font-medium text-ink-900 hover:text-ve-600 hover:underline">{s.title}</Link>
                        <div className="mt-0.5 text-xs text-ink-400">{s.code}{s.customerName ? ` · ${s.customerName}` : ""} · {s.industry.name}</div>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-3 py-3 text-ink-600">{studyPhase(s)}</td>
                      <td className="px-3 py-3 text-right text-ink-600 whitespace-nowrap">{fmtMoney(s.estimatedValue, s.currency)}</td>
                      <td className="px-3 py-3 text-center font-medium text-ve-600">{s.businessCase?.roiPct != null ? fmtPct(s.businessCase.roiPct) : "—"}</td>
                      <td className="px-3 py-3 text-center text-ink-600">{payback(s.businessCase?.paybackMonths)}</td>
                      <td className="px-3 py-3 text-ink-600">{s.owner.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-ink-400">
          Value is each study&apos;s estimated impact; ROI and payback come from its business case. {STATUS_LABEL.IN_REVIEW} studies sit at the decision gate. Open a study for its full Job Plan and business case.
        </p>
      </div>
    </div>
  );
}
