import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, HealthPill, StatTile } from "@/components/ui";
import { TrackPhaseControl } from "@/components/TrackControls";
import { WorkPackageEditor } from "@/components/WorkPackageEditor";
import { KpiTargetEditor } from "@/components/KpiTargetEditor";
import { AdoptionEditor } from "@/components/AdoptionEditor";
import { BenefitEditor } from "@/components/BenefitEditor";
import { RiskEditor } from "@/components/RiskEditor";
import { KPI_CATALOG } from "@/lib/domain/kpis";
import { TrackActions } from "@/components/TrackActions";
import { CommentThread } from "@/components/CommentThread";
import { VR_PHASES } from "@/lib/domain/phases";
import { PlaybookBar } from "@/components/PlaybookBar";
import { ExitCriteriaChecklist } from "@/components/ExitCriteriaChecklist";
import { exitCriteriaFor } from "@/lib/gates";
import { StarterTextPanel } from "@/components/StarterTextPanel";
import { ActivityFeed } from "@/components/ActivityFeed";
import { fmtMoney, fmtPct } from "@/lib/finance";

export const dynamic = "force-dynamic";

const PHASE_TITLE = Object.fromEntries(VR_PHASES.map((p) => [p.key, p.title]));

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { id } = await params;
  const { phase: phaseParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const track = await prisma.realizationTrack.findUnique({
    where: { id },
    include: {
      industry: true,
      owner: true,
      study: { include: { businessCase: true } },
      engagement: { select: { id: true, code: true, accountName: true } },
      phases: true,
      workPackages: { orderBy: { order: "asc" }, include: { recommendation: true } },
      adoptionPlan: { include: { activities: { orderBy: { order: "asc" } } } },
      benefits: true,
      kpiTargets: { include: { definition: true, actuals: { orderBy: { periodDate: "asc" } } } },
      reports: { orderBy: { createdAt: "desc" } },
      lessons: true,
      risks: true,
      comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!track) notFound();

  const events = await prisma.auditEvent.findMany({
    where: { OR: [{ trackId: track.id }, { entityType: "RealizationTrack", entityId: track.id }] },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const templates = await prisma.phaseTemplate.findMany({ where: { discipline: "VR" } });
  const tmplByPhase = Object.fromEntries(templates.map((t) => [t.vrPhase as string, t]));

  const activePhaseKey =
    phaseParam ||
    track.phases.find((p) => p.status === "IN_PROGRESS")?.phase ||
    track.phases.sort((a, b) => a.order - b.order).find((p) => p.status !== "COMPLETE")?.phase ||
    track.phases[0]?.phase;
  const activePhase = track.phases.find((p) => p.phase === activePhaseKey);
  const tmpl = activePhaseKey ? tmplByPhase[activePhaseKey] : null;
  const tmplContent = tmpl?.content as { requiredInputs: string[]; tasks: string[]; artifacts: string[]; exitCriteria: string[] } | undefined;

  const canEdit = can(user.role, "track.edit");
  const canDelete = can(user.role, "track.delete");
  const canKpi = can(user.role, "kpi.record");

  const planned = track.plannedValue ?? 0;
  const realized = track.realizedValue ?? 0;
  const variance = planned > 0 ? ((realized - planned) / planned) * 100 : null;
  const wpDone = track.workPackages.filter((w) => w.status === "DONE").length;
  const onTime = track.workPackages.length > 0 ? (wpDone / track.workPackages.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Link href="/vr" className="hover:text-vr-700">Value Realisation</Link>
            <span>/</span>
            <span>{track.code}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{track.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <StatusBadge status={track.status} />
            <HealthPill health={track.health} />
            <span className="badge bg-vr-50 text-vr-700">{track.industry.name}</span>
            <span>· Owner {track.owner.name}</span>
            {track.study ? (
              <span>· Source study{" "}
                <Link href={`/ve/${track.studyId}`} className="text-ve-600 hover:underline">{track.study.code}</Link>
              </span>
            ) : (
              <span>· Standalone (existing software)</span>
            )}
            {track.engagement && (
              <span>· Referenced by{" "}
                <Link href={`/cs/${track.engagement.id}`} className="font-medium text-ink-700 hover:underline" title={track.engagement.accountName}>{track.engagement.code}</Link>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {track.study && (
            <Link href={`/ve/${track.studyId}/report`} className="btn-ghost">Status report</Link>
          )}
          <a href={`/api/export/vrp/${track.id}`} className="btn-vr">Export VRP / QBR ↓</a>
          {canEdit && (
            <TrackActions trackId={track.id} code={track.code} status={track.status} canDelete={canDelete} />
          )}
        </div>
      </div>

      {/* Value KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Planned value" value={fmtMoney(planned, track.currency)} accent="ve" />
        <StatTile label="Realised value" value={fmtMoney(realized, track.currency)} sub={`${fmtPct((realized / (planned || 1)) * 100)} of plan`} accent="vr" />
        <StatTile label="Variance vs plan" value={fmtPct(variance)} accent={(variance ?? 0) >= 0 ? "vr" : "ink"} />
        <StatTile label="On-time implementation" value={fmtPct(onTime)} sub={`${wpDone}/${track.workPackages.length} work pkgs`} accent="vr" />
      </div>

      {/* Phase playbook */}
      <PlaybookBar
        title="Value Realisation lifecycle"
        phases={track.phases.map((p) => ({ key: p.phase, name: PHASE_TITLE[p.phase], order: p.order, status: p.status }))}
        activeKey={activePhaseKey ?? ""}
        basePath={`/vr/${track.id}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Phase guidance */}
          {tmpl && activePhase && (
            <div className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="label">Phase {activePhase.order} · guidance</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink-900">{tmpl.title}</h2>
                  <p className="mt-1 text-sm text-ink-600">{tmpl.purpose}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={activePhase.status} />
                  <TrackPhaseControl trackId={track.id} phase={activePhase.phase} status={activePhase.status} canEdit={canEdit} />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <GuidanceList title="Key questions" items={(tmpl.keyQuestions as string[]) ?? []} />
                <GuidanceList title="Tasks" items={tmplContent?.tasks ?? []} />
              </div>
              <div className="mt-4">
                <ExitCriteriaChecklist
                  kind="VR"
                  id={track.id}
                  phaseKey={activePhase.phase}
                  criteria={exitCriteriaFor("VR", activePhase.phase)}
                  checklist={activePhase.checklist as Record<string, boolean> | null}
                  canEdit={canEdit}
                />
              </div>
              <StarterTextPanel kind="VR" phaseKey={activePhase.phase} industryKey={track.industryKey} />
            </div>
          )}

          {/* Work packages */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Implementation work packages</h2>
            <WorkPackageEditor
              trackId={track.id}
              canEdit={canEdit}
              items={track.workPackages.map((w) => ({
                id: w.id,
                name: w.name,
                description: w.description,
                recTitle: w.recommendation?.title ?? null,
                isMilestone: w.isMilestone,
                startDate: w.startDate ? w.startDate.toISOString().slice(0, 10) : null,
                dueDate: w.dueDate ? w.dueDate.toISOString().slice(0, 10) : null,
                status: w.status,
              }))}
            />
          </div>

          {/* KPI tracker */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">KPI tracker — planned vs actual</h2>
            <KpiTargetEditor
              trackId={track.id}
              canEdit={canEdit}
              canKpi={canKpi}
              catalog={KPI_CATALOG.map((k) => ({ key: k.key, name: k.name, unit: k.unit }))}
              items={track.kpiTargets.map((k) => ({
                id: k.id,
                kpiKey: k.kpiKey,
                name: k.definition.name,
                baselineValue: k.baselineValue,
                targetValue: k.targetValue,
                unit: k.unit,
                frequency: k.frequency,
                dataSource: k.dataSource,
                ownerName: k.ownerName,
                actuals: k.actuals.map((a) => ({ id: a.id, periodLabel: a.periodLabel, value: a.value })),
              }))}
            />
          </div>

          {/* Value reports */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Value reports & QBR/EBR</h2>
            <div className="space-y-2">
              {track.reports.map((r) => {
                const c = (r.content as { executiveStory?: string }) ?? {};
                return (
                  <div key={r.id} className="rounded-lg border border-ink-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-vr-50 text-vr-700">{r.kind.replaceAll("_", " ").toLowerCase()}</span>
                      <span className="font-medium text-ink-800">{r.title}</span>
                    </div>
                    {c.executiveStory && <p className="mt-1 text-sm text-ink-600">{c.executiveStory}</p>}
                  </div>
                );
              })}
              {track.reports.length === 0 && <p className="text-sm text-ink-500">No reports yet.</p>}
            </div>
          </div>

          {/* Risks & issues */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Risks & issues</h2>
            <RiskEditor
              parent="track"
              parentId={track.id}
              canEdit={canEdit}
              items={track.risks.map((r) => ({ id: r.id, title: r.title, description: r.description, likelihood: r.likelihood, impact: r.impact, mitigation: r.mitigation, owner: r.owner, status: r.status }))}
            />
          </div>

          {/* Discussion */}
          <CommentThread
            entityType="RealizationTrack"
            entityId={track.id}
            trackId={track.id}
            accent="vr"
            currentUserId={user.id}
            currentUserRole={user.role}
            comments={track.comments
              .filter((c) => c.entityType === "RealizationTrack")
              .map((c) => ({ id: c.id, body: c.body, authorId: c.authorId, authorName: c.author.name, createdAt: c.createdAt.toISOString() }))}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ActivityFeed events={events.map((e) => ({ id: e.id, action: e.action, actor: e.actor?.name ?? null, at: e.createdAt, meta: e.metadata as Record<string, unknown> | null }))} />
          {/* Benefits realisation */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Benefits realisation</h2>
            <BenefitEditor
              trackId={track.id}
              currency={track.currency}
              canEdit={canEdit}
              items={track.benefits.map((b) => ({ id: b.id, label: b.label, category: b.category, plannedValue: b.plannedValue, realizedValue: b.realizedValue }))}
            />
          </div>

          {/* Adoption plan */}
          <div className="card card-pad">
            <h2 className="mb-2 font-semibold text-ink-900">Adoption & change</h2>
            {track.adoptionPlan?.changeImpact && <p className="mb-2 text-sm text-ink-600">{track.adoptionPlan.changeImpact}</p>}
            <AdoptionEditor
              trackId={track.id}
              canEdit={canEdit}
              items={(track.adoptionPlan?.activities ?? []).map((a) => ({ id: a.id, label: a.label, audience: a.audience, dueDate: a.dueDate ? a.dueDate.toISOString().slice(0, 10) : null, status: a.status }))}
            />
          </div>

          {/* Objectives / success criteria */}
          <div className="card card-pad">
            <div className="label">Objectives</div>
            <p className="mt-1 text-sm text-ink-700">{track.objectives ?? "—"}</p>
            <div className="mt-3 label">Success criteria</div>
            <p className="mt-1 text-sm text-ink-700">{track.successCriteria ?? "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuidanceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="label">{title}</div>
      <ul className="mt-1.5 space-y-1 text-sm text-ink-700">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2"><span className="text-ink-300">•</span>{it}</li>
        ))}
      </ul>
    </div>
  );
}
