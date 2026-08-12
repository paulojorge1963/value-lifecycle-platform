import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatTile } from "@/components/ui";
import { CostItemEditor } from "@/components/CostItemEditor";
import { VersionHistory } from "@/components/VersionHistory";
import { computeFinance, fmtMoney, fmtPct, type CashFlowLine } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function BusinessCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      businessCase: { include: { scenarios: { orderBy: { order: "asc" } }, costItems: true } },
      handover: { orderBy: { order: "asc" } },
      risks: true,
    },
  });
  if (!study) notFound();
  const bc = study.businessCase;
  const canEdit = !!user && can(user.role, "study.edit");

  const versions = bc
    ? await prisma.documentVersion.findMany({
        where: { entityType: "BusinessCase", entityId: bc.id },
        include: { author: true },
        orderBy: { version: "desc" },
      })
    : [];

  const lines: CashFlowLine[] = (bc?.costItems ?? []).map((c) => ({
    label: c.label,
    kind: c.kind as CashFlowLine["kind"],
    amount: c.amount,
    year: c.year,
    recurring: c.recurring,
  }));
  const fin = computeFinance(lines, {
    discountRatePct: bc?.discountRatePct ?? 10,
    horizonYears: bc?.horizonYears ?? 5,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Link href="/ve" className="hover:text-ve-700">Value Engineering</Link>
            <span>/</span>
            <Link href={`/ve/${study.id}`} className="hover:text-ve-700">{study.code}</Link>
            <span>/</span>
            <span>Business case</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Business case — {study.title}</h1>
        </div>
        <a href={`/api/export/business-case/${study.id}`} className="btn-ve">Export to Word ↓</a>
      </div>

      {!bc ? (
        <div className="card card-pad text-ink-500">No business case yet for this study.</div>
      ) : (
        <>
          {bc.executiveSummary && (
            <div className="card card-pad">
              <div className="label">Executive summary</div>
              <p className="mt-2 text-ink-700">{bc.executiveSummary}</p>
            </div>
          )}

          {/* Live-computed financials */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="ROI" value={fmtPct(fin.roiPct)} sub={`${bc.horizonYears}-yr horizon`} accent="ve" />
            <StatTile label="Payback" value={fin.paybackMonths != null ? `${fin.paybackMonths.toFixed(1)} mo` : "—"} accent="ve" />
            <StatTile label={`NPV @ ${bc.discountRatePct}%`} value={fmtMoney(fin.npv, bc.currency)} accent="ve" />
            <StatTile label="IRR" value={fmtPct(fin.irrPct)} accent="ve" />
          </div>
          <p className="-mt-2 text-xs text-ink-400">
            Recomputed live from cost/benefit line items by the finance engine — investment {fmtMoney(fin.totalInvestment, bc.currency)}, annual net benefit {fmtMoney(fin.annualNetBenefit, bc.currency)}.
          </p>

          {/* Scenarios */}
          <div className="grid gap-4 md:grid-cols-2">
            {bc.scenarios.map((s) => (
              <div key={s.id} className={`card card-pad ${s.isBaseline ? "" : "ring-1 ring-ve-100"}`}>
                <div className="flex items-center gap-2">
                  <span className={`badge ${s.isBaseline ? "bg-ink-100 text-ink-600" : "bg-ve-100 text-ve-700"}`}>
                    {s.isBaseline ? "Baseline" : "Proposed"}
                  </span>
                  <span className="font-medium text-ink-900">{s.name}</span>
                </div>
                {s.description && <p className="mt-2 text-sm text-ink-600">{s.description}</p>}
              </div>
            ))}
          </div>

          {/* Cost / benefit table */}
          <CostItemEditor
            businessCaseId={bc.id}
            studyId={study.id}
            items={bc.costItems.map((c) => ({ id: c.id, label: c.label, kind: c.kind, category: c.category, amount: c.amount, year: c.year, recurring: c.recurring }))}
            currency={bc.currency}
            canEdit={canEdit}
          />

          {/* LCCA */}
          {bc.lccaNotes && (
            <div className="card card-pad">
              <div className="label">Life-cycle cost analysis</div>
              <p className="mt-2 text-sm text-ink-700">{bc.lccaNotes}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {fin.lccByYear.map((v, y) => (
                  <span key={y} className="rounded bg-ink-100 px-2 py-1 text-ink-600">Yr {y}: {fmtMoney(v, bc.currency)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {study.risks.length > 0 && (
            <div className="card card-pad">
              <h2 className="mb-3 font-semibold text-ink-900">Risks & mitigations</h2>
              <ul className="space-y-2 text-sm">
                {study.risks.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 border-b border-ink-100 pb-2">
                    <div>
                      <div className="font-medium text-ink-800">{r.title}</div>
                      {r.mitigation && <div className="text-ink-500">Mitigation: {r.mitigation}</div>}
                    </div>
                    <span className="badge bg-ink-100 text-ink-600">L{r.likelihood ?? "?"}·I{r.impact ?? "?"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Value handover section */}
          <div className="card card-pad ring-1 ring-vr-100">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-vr-500" />
              <h2 className="font-semibold text-ink-900">Value handover — baselines, KPIs & success criteria</h2>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {study.handover.map((h) => (
                <div key={h.id} className="rounded-lg border border-ink-200 p-3">
                  <span className="badge bg-vr-50 text-vr-700">{h.type.replaceAll("_", " ").toLowerCase()}</span>
                  <div className="mt-1 font-medium text-ink-800">{h.title}</div>
                  {h.detail && <div className="text-sm text-ink-500">{h.detail}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Version history */}
          <VersionHistory
            studyId={study.id}
            canEdit={canEdit}
            versions={versions.map((v) => ({
              id: v.id,
              version: v.version,
              authorName: v.author?.name ?? "Unknown",
              createdAt: v.createdAt.toISOString(),
              snapshot: (v.snapshot as Record<string, unknown>) ?? {},
            }))}
          />
        </>
      )}
    </div>
  );
}
