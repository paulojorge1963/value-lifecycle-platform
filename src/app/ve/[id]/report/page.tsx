import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge, HealthPill } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { VE_PHASES } from "@/lib/domain/phases";
import { fmtMoney, fmtPct } from "@/lib/finance";

export const dynamic = "force-dynamic";

const PHASE_TITLE = Object.fromEntries(VE_PHASES.map((p) => [p.key, p.title]));

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function StudyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  // Org-scoped fetch keeps the report inside the caller's workspace.
  const study = await prisma.study.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      industry: true,
      owner: true,
      organization: { select: { name: true } },
      phases: true,
      recommendations: { orderBy: { order: "asc" } },
      businessCase: true,
      risks: true,
      comments: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 2 },
      tracks: {
        include: {
          owner: true,
          workPackages: true,
          benefits: true,
          kpiTargets: { include: { definition: true, actuals: { orderBy: { periodDate: "asc" } } } },
        },
      },
    },
  });
  if (!study) notFound();

  // Exit criteria for the current phase (guidance = quality gate / next steps).
  const templates = await prisma.phaseTemplate.findMany({ where: { discipline: "VE" } });
  const tmplByPhase = Object.fromEntries(templates.map((t) => [t.vePhase as string, t]));

  const phases = [...study.phases].sort((a, b) => a.order - b.order);
  const total = phases.length;
  const done = phases.filter((p) => p.status === "COMPLETE").length;
  const currentPhase =
    phases.find((p) => p.status === "IN_PROGRESS") ?? phases.find((p) => p.status !== "COMPLETE") ?? phases[total - 1];
  const pct = total ? Math.round((done / total) * 100) : 0;
  const currentTmpl = currentPhase ? tmplByPhase[currentPhase.phase] : null;
  const exitCriteria =
    (currentTmpl?.content as { exitCriteria?: string[] } | undefined)?.exitCriteria ?? [];

  const recs = study.recommendations;
  const accepted = recs.filter((r) => r.status === "ACCEPTED");
  const pending = recs.filter((r) => r.status === "PROPOSED" || r.status === "SHORTLISTED");

  const risks = [...study.risks]
    .sort((a, b) => (b.likelihood ?? 0) * (b.impact ?? 0) - (a.likelihood ?? 0) * (a.impact ?? 0))
    .slice(0, 4);

  const bc = study.businessCase;
  const cur = study.currency;

  const track = study.tracks[0];
  const handedOver = !!track;
  const planned = track?.plannedValue ?? 0;
  const realized = track?.realizedValue ?? 0;
  const variance = planned > 0 ? ((realized - planned) / planned) * 100 : 0;
  const wpDone = track ? track.workPackages.filter((w) => w.status === "DONE").length : 0;
  const wpTotal = track?.workPackages.length ?? 0;
  const onTime = wpTotal > 0 ? (wpDone / wpTotal) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Toolbar — screen only */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/ve/${study.id}`} className="btn-ghost">← Back to study</Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-400">Tip: choose “Save as PDF” in the print dialog.</span>
          <PrintButton />
        </div>
      </div>

      {/* Report sheet */}
      <div className="card overflow-hidden">
        {/* Header band */}
        <div className="report-block border-l-4 border-ve-600 bg-ve-50 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="label text-ve-700">Value Study · Management Status Report</div>
              <h1 className="mt-1 text-2xl font-bold text-ink-900">{study.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                <span className="font-mono text-ink-500">{study.code}</span>
                <StatusBadge status={study.status} />
                <span className="badge bg-white text-ve-700">{study.industry.name}</span>
                {study.studyType && <span className="badge bg-white text-ink-600">{study.studyType}</span>}
              </div>
            </div>
            <div className="text-right text-xs text-ink-500">
              <div className="font-semibold text-ink-700">{study.organization.name}</div>
              <div className="mt-1">Owner: {study.owner.name}</div>
              <div>Generated {fmtDate(new Date())}</div>
              {study.targetDate && <div>Target: {fmtDate(study.targetDate)}</div>}
            </div>
          </div>
          {study.problemStatement && (
            <p className="mt-3 max-w-3xl text-sm text-ink-700">
              <span className="font-semibold text-ink-800">Problem: </span>{study.problemStatement}
            </p>
          )}
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Headline value tiles */}
          <section className="report-block">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReportTile label="Planned value" value={fmtMoney(study.estimatedValue, cur)} accent="ve" />
              <ReportTile label="ROI" value={bc?.roiPct != null ? `${bc.roiPct.toFixed(0)}%` : "—"} />
              <ReportTile label="Payback" value={bc?.paybackMonths != null ? `${bc.paybackMonths.toFixed(0)} mo` : "—"} />
              <ReportTile label="NPV" value={fmtMoney(bc?.npv, cur)} />
            </div>
          </section>

          {/* Phase progress */}
          <section className="report-block">
            <div className="flex items-end justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">VE Job Plan progress</h2>
              <span className="text-sm text-ink-600">
                Phase {currentPhase?.order ?? total} of {total} · {done}/{total} complete
                {currentPhase && study.status !== "HANDED_OVER" && (
                  <span className="text-ink-400"> · currently {PHASE_TITLE[currentPhase.phase]}</span>
                )}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div className="h-full bg-ve-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {phases.map((p) => {
                const isDone = p.status === "COMPLETE";
                const isActive = p.phase === currentPhase?.phase && !isDone;
                return (
                  <span
                    key={p.phase}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${
                      isDone
                        ? "border-transparent bg-ve-50 text-ve-700"
                        : isActive
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-ink-200 bg-white text-ink-400"
                    }`}
                  >
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white ${
                        isDone ? "bg-ve-600" : isActive ? "bg-amber-500" : "bg-ink-300"
                      }`}
                    >
                      {p.order}
                    </span>
                    {PHASE_TITLE[p.phase]}
                  </span>
                );
              })}
            </div>
          </section>

          {/* Two-column body */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recommendations */}
            <section className="report-block">
              <SectionTitle>Recommendations ({accepted.length}/{recs.length} accepted)</SectionTitle>
              {recs.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                      <th className="py-1.5 pr-2 font-semibold">Recommendation</th>
                      <th className="py-1.5 pr-2 font-semibold">Status</th>
                      <th className="py-1.5 text-right font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recs.map((r) => (
                      <tr key={r.id} className="border-b border-ink-100 align-top">
                        <td className="py-1.5 pr-2 text-ink-800">{r.title}</td>
                        <td className="py-1.5 pr-2"><StatusBadge status={r.status} /></td>
                        <td className="py-1.5 text-right text-ink-600">{fmtMoney(r.estimatedValue, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty>No recommendations developed yet.</Empty>
              )}
            </section>

            {/* Decisions pending */}
            <section className="report-block">
              <SectionTitle>Decisions pending</SectionTitle>
              {pending.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {pending.map((r) => (
                    <li key={r.id} className="flex items-start gap-2">
                      <span className="mt-0.5 badge bg-amber-100 text-amber-700">{r.status.toLowerCase()}</span>
                      <span className="text-ink-700">{r.title}</span>
                    </li>
                  ))}
                  <li className="pt-1 text-xs text-ink-400">Awaiting reviewer accept / reject before handover.</li>
                </ul>
              ) : (
                <Empty>
                  {accepted.length > 0
                    ? "No decisions outstanding — recommendations reviewed."
                    : "No recommendations awaiting a decision."}
                </Empty>
              )}
            </section>

            {/* Key risks */}
            <section className="report-block">
              <SectionTitle>Key risks</SectionTitle>
              {risks.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {risks.map((r) => {
                    const score = (r.likelihood ?? 0) * (r.impact ?? 0);
                    const sev = score >= 15 ? "bg-red-100 text-red-700" : score >= 8 ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-600";
                    return (
                      <li key={r.id}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-ink-800">{r.title}</span>
                          <span className={`badge ${sev}`}>L{r.likelihood ?? "–"}×I{r.impact ?? "–"}</span>
                        </div>
                        {r.mitigation && <div className="text-xs text-ink-500">Mitigation: {r.mitigation}</div>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty>No risks logged.</Empty>
              )}
            </section>

            {/* Next steps */}
            <section className="report-block">
              <SectionTitle>Next steps</SectionTitle>
              {study.status === "HANDED_OVER" ? (
                <Empty>Handed over to realization — see the realization status below.</Empty>
              ) : done === total ? (
                <Empty>All VE phases complete — ready for handover to realization.</Empty>
              ) : exitCriteria.length > 0 ? (
                <>
                  <div className="text-xs text-ink-400">To complete “{currentPhase ? PHASE_TITLE[currentPhase.phase] : ""}”:</div>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink-700">
                    {exitCriteria.map((c, i) => (
                      <li key={i} className="flex gap-2"><span className="text-ve-500">▢</span>{c}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <Empty>Advance the current phase to its exit criteria.</Empty>
              )}
            </section>
          </div>

          {/* Realization status — only once handed over */}
          {handedOver && track && (
            <section className="report-block rounded-lg border border-vr-200 bg-vr-50/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-vr-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-vr-500" /> Realization status · {track.code}
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <StatusBadge status={track.status} />
                  <HealthPill health={track.health} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ReportTile label="Planned value" value={fmtMoney(planned, track.currency)} accent="ve" />
                <ReportTile label="Realized value" value={fmtMoney(realized, track.currency)} sub={`${fmtPct((realized / (planned || 1)) * 100)} of plan`} accent="vr" />
                <ReportTile label="Variance vs plan" value={fmtPct(variance)} accent={variance >= 0 ? "vr" : "ink"} />
                <ReportTile label="On-time delivery" value={fmtPct(onTime)} sub={`${wpDone}/${wpTotal} work pkgs`} accent="vr" />
              </div>

              {track.kpiTargets.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">KPI actuals vs target</div>
                  <table className="mt-1.5 w-full text-sm">
                    <tbody>
                      {track.kpiTargets.map((k) => {
                        const latest = k.actuals[k.actuals.length - 1];
                        return (
                          <tr key={k.id} className="border-b border-vr-100">
                            <td className="py-1.5 text-ink-800">{k.definition.name}</td>
                            <td className="py-1.5 text-right text-ink-500">Baseline {k.baselineValue ?? "—"} → Target {k.targetValue ?? "—"} {k.unit}</td>
                            <td className="py-1.5 pl-3 text-right font-semibold text-vr-700">{latest ? `${latest.value} ${k.unit}` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Footer: latest activity */}
          <section className="report-block border-t border-ink-100 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3 text-xs text-ink-500">
              <div>
                <span className="font-semibold uppercase tracking-wide text-ink-400">Latest activity</span>
                {study.comments.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {study.comments.map((c) => (
                      <li key={c.id}>
                        <span className="text-ink-700">{c.author.name}</span> · {fmtDate(c.createdAt)} — {c.body.length > 90 ? c.body.slice(0, 90) + "…" : c.body}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1">No discussion recorded.</div>
                )}
              </div>
              <div className="text-right">
                Value Lifecycle Platform<br />
                Report generated {fmtDate(new Date())}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ReportTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "ve" | "vr" | "ink" }) {
  const bar = accent === "ve" ? "bg-ve-500" : accent === "vr" ? "bg-vr-500" : "bg-ink-400";
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${bar}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-ink-900">{value}</div>
      {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">{children}</h2>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-400">{children}</p>;
}
