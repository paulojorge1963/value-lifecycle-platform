import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge, HealthPill, ProgressBar } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { VR_PHASES } from "@/lib/domain/phases";
import { fmtMoney, fmtPct } from "@/lib/finance";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "VR Track — Status Report" };

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-ink-400">{sub}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3 text-sm font-semibold text-ink-900">{title}</div>
      {children}
    </div>
  );
}

type Qbr = { executiveStory?: string; nextBestActions?: string[] | string; expansion?: string } | undefined;

export default async function VrTrackReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const track = await prisma.realizationTrack.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      industry: true,
      owner: true,
      study: { select: { code: true, id: true } },
      phases: true,
      workPackages: { orderBy: { order: "asc" }, include: { recommendation: { select: { title: true } } } },
      adoptionPlan: { include: { activities: true } },
      benefits: true,
      kpiTargets: { include: { definition: true, actuals: { orderBy: { periodDate: "asc" } } } },
      risks: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!track) notFound();
  const cur = track.currency;

  const phases = [...track.phases].sort((a, b) => a.order - b.order);
  const total = phases.length;
  const done = phases.filter((p) => p.status === "COMPLETE").length;
  const current = phases.find((p) => p.status === "IN_PROGRESS") ?? phases.find((p) => p.status !== "COMPLETE") ?? phases[total - 1];
  const phasePct = total ? Math.round((done / total) * 100) : 0;
  const phaseTitle = (k: string) => VR_PHASES.find((p) => p.key === k)?.title ?? k;

  const planned = track.plannedValue ?? 0;
  const realized = track.realizedValue ?? 0;
  const valuePct = planned > 0 ? (realized / planned) * 100 : 0;

  const openRisks = [...track.risks].filter((r) => r.status === "OPEN")
    .sort((a, b) => (b.likelihood ?? 0) * (b.impact ?? 0) - (a.likelihood ?? 0) * (a.impact ?? 0));

  const qbr = track.reports[0]?.content as Qbr;
  const nextActions: string[] = Array.isArray(qbr?.nextBestActions) ? qbr!.nextBestActions as string[] : (qbr?.nextBestActions ? [qbr.nextBestActions as string] : []);

  return (
    <div className="space-y-6">
      {/* Controls — hidden in print / PDF */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/vr/${track.id}`} className="text-sm text-vr-600 hover:underline">← {track.code}</Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">Track Status Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton className="btn-ghost" />
          <a href={`/api/export/vr-status/${track.id}/pptx`} className="btn-ghost">PPTX ↓</a>
          <a href={`/api/export/vr-status/${track.id}`} className="btn-vr">Download (Word) ↓</a>
        </div>
      </div>

      {/* Report body */}
      <div className="space-y-6">
        <div className="border-b border-ink-100 pb-4">
          <div className="text-xs font-medium uppercase tracking-wide text-vr-600">Value Realisation · Track status report</div>
          <h2 className="mt-1 text-2xl font-semibold text-ink-900">{track.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <StatusBadge status={track.status} />
            <HealthPill health={track.health} />
            <span className="badge bg-vr-50 text-vr-700">{track.industry.name}</span>
            <span>· {track.code}</span>
            <span>· {track.study ? <>from <span className="text-ve-600">{track.study.code}</span></> : "standalone (existing software)"}</span>
            <span>· Owner {track.owner.name}</span>
            <span>· Generated {fmtDate(new Date())}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Value realised" value={fmtPct(valuePct)} sub={`${fmtMoney(realized, cur)} of ${fmtMoney(planned, cur)}`} />
          <Stat label="Phase progress" value={`${done}/${total}`} sub={current ? `current: ${phaseTitle(current.phase)}` : "—"} />
          <Stat label="Open risks" value={String(openRisks.length)} />
          <Stat label="Target date" value={fmtDate(track.targetDate)} />
        </div>

        {/* Objectives / success criteria */}
        {(track.objectives || track.successCriteria) && (
          <Section title="Objectives & success criteria">
            {track.objectives ? <p className="text-sm text-ink-600">{track.objectives}</p> : null}
            {track.successCriteria ? <p className="mt-2 text-sm text-ink-500"><span className="font-medium text-ink-700">Success criteria:</span> {track.successCriteria}</p> : null}
          </Section>
        )}

        {/* Phase progress */}
        <Section title="Phase progress">
          <div className="mb-3"><ProgressBar pct={phasePct} accent="vr" /></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {phases.map((ph) => (
              <div key={ph.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                <span className={ph.id === current?.id ? "font-semibold text-vr-700" : "text-ink-600"}>{ph.order}. {phaseTitle(ph.phase)}</span>
                <span className="text-xs uppercase tracking-wide text-ink-400">{ph.status.replace(/_/g, " ").toLowerCase()}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* KPIs */}
        <Section title="KPIs — baseline → target → latest">
          {track.kpiTargets.length === 0 ? <p className="text-sm text-ink-400">No KPIs recorded.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-2 py-2 font-medium">KPI</th><th className="px-2 py-2 font-medium">Baseline</th><th className="px-2 py-2 font-medium">Target</th><th className="px-2 py-2 font-medium">Latest</th><th className="px-2 py-2 font-medium">Source</th>
                </tr></thead>
                <tbody>
                  {track.kpiTargets.map((k) => {
                    const latest = k.actuals[k.actuals.length - 1];
                    return (
                      <tr key={k.id} className="border-b border-ink-50">
                        <td className="px-2 py-2 text-ink-700">{k.definition.name}</td>
                        <td className="px-2 py-2 text-ink-600">{k.baselineValue ?? "—"}{k.baselineValue != null ? ` ${k.unit}` : ""}</td>
                        <td className="px-2 py-2 text-ink-600">{k.targetValue ?? "—"}{k.targetValue != null ? ` ${k.unit}` : ""}</td>
                        <td className="px-2 py-2 font-medium text-vr-600">{latest ? `${latest.value} ${k.unit}` : "—"}</td>
                        <td className="px-2 py-2 text-ink-400">{k.dataSource ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Work packages */}
        <Section title={`Work packages (${track.workPackages.length})`}>
          {track.workPackages.length === 0 ? <p className="text-sm text-ink-400">No work packages.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-2 py-2 font-medium">Work package</th><th className="px-2 py-2 font-medium">From recommendation</th><th className="px-2 py-2 font-medium">Due</th><th className="px-2 py-2 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {track.workPackages.map((w) => (
                    <tr key={w.id} className="border-b border-ink-50">
                      <td className="px-2 py-2 text-ink-700">{w.name}</td>
                      <td className="px-2 py-2 text-ink-500">{w.recommendation?.title ?? "—"}</td>
                      <td className="px-2 py-2 text-ink-600 whitespace-nowrap">{fmtDate(w.dueDate)}</td>
                      <td className="px-2 py-2 text-ink-600">{w.status.replace(/_/g, " ").toLowerCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Benefits */}
        <Section title="Benefits realisation">
          {track.benefits.length === 0 ? <p className="text-sm text-ink-400">No benefits recorded.</p> : (
            <div className="space-y-3">
              {track.benefits.map((b) => {
                const bp = b.plannedValue > 0 ? (b.realizedValue / b.plannedValue) * 100 : 0;
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-700">{b.label}</span>
                      <span className="text-ink-500">{fmtMoney(b.realizedValue, b.currency)} of {fmtMoney(b.plannedValue, b.currency)} <span className="font-medium text-vr-600">({fmtPct(bp)})</span></span>
                    </div>
                    <div className="mt-1"><ProgressBar pct={bp} accent="vr" /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Adoption */}
        {(track.adoptionPlan?.changeImpact || (track.adoptionPlan?.activities?.length ?? 0) > 0) && (
          <Section title="Adoption & change management">
            {track.adoptionPlan?.changeImpact ? <p className="text-sm text-ink-600">{track.adoptionPlan.changeImpact}</p> : null}
            {(track.adoptionPlan?.activities?.length ?? 0) > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-ink-600">
                {track.adoptionPlan!.activities.map((a) => (
                  <li key={a.id}>• {a.label} <span className="text-ink-400">({a.audience ?? "all"}) — {a.status.replace(/_/g, " ").toLowerCase()}</span></li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* Risks */}
        <Section title={`Open risks (${openRisks.length})`}>
          {openRisks.length === 0 ? <p className="text-sm text-ink-400">No open risks.</p> : (
            <ul className="space-y-2 text-sm">
              {openRisks.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 badge bg-amber-50 text-amber-700">{(r.likelihood ?? 0) * (r.impact ?? 0) || "—"}</span>
                  <span className="text-ink-700">{r.title}{r.mitigation ? <span className="text-ink-500"> — {r.mitigation}</span> : null}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* QBR story */}
        {(qbr?.executiveStory || nextActions.length > 0 || qbr?.expansion) && (
          <Section title="Latest QBR / EBR — executive value story">
            {qbr?.executiveStory ? <p className="text-sm text-ink-600">{qbr.executiveStory}</p> : null}
            {nextActions.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-ink-600">{nextActions.map((a, i) => <li key={i}>• Next best action: {a}</li>)}</ul>
            )}
            {qbr?.expansion ? <p className="mt-2 text-sm text-ink-500"><span className="font-medium text-ink-700">Expansion:</span> {qbr.expansion}</p> : null}
          </Section>
        )}
      </div>
    </div>
  );
}
