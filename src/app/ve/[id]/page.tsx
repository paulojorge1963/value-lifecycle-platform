import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, Money, PhaseStepper } from "@/components/ui";
import { PhaseStatusControl, HandoverButton } from "@/components/StudyControls";
import { StudyActions } from "@/components/StudyActions";
import { CvrSnapshots } from "@/components/CvrSnapshots";
import { FunctionEditor } from "@/components/FunctionEditor";
import { FastDiagram } from "@/components/FastDiagram";
import { CommentThread } from "@/components/CommentThread";
import { AlternativeEditor } from "@/components/AlternativeEditor";
import { EvaluationMatrix } from "@/components/EvaluationMatrix";
import { RecommendationEditor } from "@/components/RecommendationEditor";
import { ValueStoryEditor } from "@/components/ValueStoryEditor";
import type { ValueStory } from "@/lib/actions";
import { VE_PHASES } from "@/lib/domain/phases";
import { PlaybookBar } from "@/components/PlaybookBar";
import { ExitCriteriaChecklist } from "@/components/ExitCriteriaChecklist";
import { exitCriteriaFor, unmetCriteria } from "@/lib/gates";
import { WorkspaceShell, WorkspaceSection, type SectionMeta } from "@/components/StudyWorkspace";
import { StarterTextPanel } from "@/components/StarterTextPanel";
import { ActivityFeed } from "@/components/ActivityFeed";
import { asCriteria, asScores } from "@/lib/evaluation";
import { isAiEnabled } from "@/lib/ai";
import { fmtMoney, fmtPct, computeFinance, type CashFlowLine } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await prisma.study.findUnique({ where: { id }, select: { code: true, title: true } });
  return { title: s ? `${s.code} — ${s.title}` : "VE study" };
}

const PHASE_TITLE = Object.fromEntries(VE_PHASES.map((p) => [p.key, p.title]));

export default async function StudyPage({
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

  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      industry: true,
      owner: true,
      phases: true,
      functions: { orderBy: { order: "asc" } },
      alternatives: { orderBy: { createdAt: "asc" } },
      recommendations: { orderBy: { order: "asc" } },
      businessCase: { include: { scenarios: true, costItems: true } },
      handover: { orderBy: { order: "asc" } },
      infoItems: { orderBy: { createdAt: "asc" } },
      engagement: { select: { id: true, code: true, accountName: true } },
      risks: true,
      tracks: true,
      kpiTargets: { include: { definition: true } },
      comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!study) notFound();

  const events = await prisma.auditEvent.findMany({
    where: { OR: [{ studyId: study.id }, { entityType: "Study", entityId: study.id }] },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const cvrSnapshots = await prisma.documentVersion.findMany({
    where: { entityType: "CVR", entityId: study.id },
    include: { author: { select: { name: true } } },
    orderBy: { version: "desc" },
  });

  const templates = await prisma.phaseTemplate.findMany({ where: { discipline: "VE" } });
  const tmplByPhase = Object.fromEntries(templates.map((t) => [t.vePhase as string, t]));

  const activePhaseKey =
    phaseParam ||
    study.phases.find((p) => p.status === "IN_PROGRESS")?.phase ||
    study.phases.sort((a, b) => a.order - b.order).find((p) => p.status !== "COMPLETE")?.phase ||
    study.phases[0]?.phase;
  const activePhase = study.phases.find((p) => p.phase === activePhaseKey);
  const tmpl = activePhaseKey ? tmplByPhase[activePhaseKey] : null;
  const tmplContent = tmpl?.content as { requiredInputs: string[]; tasks: string[]; artifacts: string[]; exitCriteria: string[] } | undefined;

  const acceptedCount = study.recommendations.filter((r) => r.status === "ACCEPTED").length;
  const baselineItems = study.infoItems.filter((i) => i.category !== "stakeholder");
  const infoStakeholders = study.infoItems.filter((i) => i.category === "stakeholder");
  const canEdit = can(user.role, "study.edit");
  const canDelete = can(user.role, "study.delete");
  const canDecide = can(user.role, "recommendation.accept");
  const aiEnabled = isAiEnabled();
  const canHandover = can(user.role, "track.create");

  // Workspace shell: which sections are relevant to each phase (drives the phase
  // view, the jump index and the next-action banner).
  const activeUnmet = activePhase ? unmetCriteria(exitCriteriaFor("VE", activePhase.phase), activePhase.checklist) : [];
  const wsIndex = [
    tmpl && activePhase ? { id: "guidance", title: "Phase guidance", phases: null } : null,
    { id: "functions", title: "Function model", phases: ["FUNCTION_ANALYSIS"] },
    { id: "fast", title: "FAST diagram", phases: ["FUNCTION_ANALYSIS"] },
    { id: "alternatives", title: "Alternatives", phases: ["CREATIVE", "EVALUATION"] },
    { id: "evaluation", title: "Evaluation", phases: ["EVALUATION"] },
    { id: "recommendations", title: "Recommendations", phases: ["DEVELOPMENT", "HANDOVER"] },
    { id: "valuestory", title: "Value story", phases: ["ORIENTATION", "DEVELOPMENT", "PRESENTATION"] },
    study.infoItems.length > 0 ? { id: "baseline", title: "Study baseline", phases: ["INFORMATION", "HANDOVER"] } : null,
    { id: "comments", title: "Discussion", phases: null },
  ].filter(Boolean) as SectionMeta[];

  // Content-completeness meter: what work objects are actually captured, independent
  // of the 8-phase Job Plan status (so an imported study with real content doesn't
  // read as empty just because its phases show NOT_STARTED).
  const completeness: { k: string; ok: boolean }[] = [
    { k: "Baseline", ok: study.infoItems.length > 0 },
    { k: "Functions", ok: study.functions.length > 0 },
    { k: "Alternatives", ok: study.alternatives.length > 0 },
    { k: "Evaluation", ok: study.alternatives.some((a) => a.weightedScore != null) },
    { k: "Recommendations", ok: study.recommendations.length > 0 },
    { k: "Value story", ok: !!(study.whyNow || study.whyThisSolution || study.valueStory) },
    { k: "Business case", ok: !!study.businessCase && (study.businessCase.costItems?.length ?? 0) > 0 },
    { k: "Handover", ok: study.handover.length > 0 },
  ];
  const capturedCount = completeness.filter((c) => c.ok).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Link href="/ve" className="hover:text-ve-700">Value Engineering</Link>
            <span>/</span>
            <span>{study.code}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{study.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <StatusBadge status={study.status} />
            <span className="badge bg-ve-50 text-ve-700">{study.industry.name}</span>
            {study.studyType && <span className="badge bg-ink-100 text-ink-600">{study.studyType}</span>}
            <span>· Owner {study.owner.name}</span>
            {study.engagement && (
              <span>· Referenced by{" "}
                <Link href={`/cs/${study.engagement.id}`} className="font-medium text-ink-700 hover:underline" title={study.engagement.accountName}>{study.engagement.code}</Link>
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="label">Estimated value</div>
          <div className="text-2xl font-semibold text-ink-900"><Money value={study.estimatedValue} currency={study.currency} /></div>
          <div className="mt-2 flex gap-2">
            <Link href={`/ve/${study.id}/business-case`} className="btn-ghost">Business case</Link>
            <Link href={`/ve/${study.id}/report`} className="btn-ghost">Status report</Link>
            <a href={`/api/export/business-case/${study.id}`} className="btn-ghost">Export ↓</a>
            <a href={`/api/export/cvr/${study.id}`} className="btn-ghost">Export CVR (PowerPoint) ↓</a>
            {canEdit && (
              <StudyActions studyId={study.id} code={study.code} status={study.status} canDelete={canDelete} />
            )}
          </div>
        </div>
      </div>

      {/* Phase playbook */}
      <PlaybookBar
        title="VE Job Plan"
        phases={study.phases.map((p) => ({ key: p.phase, name: PHASE_TITLE[p.phase], order: p.order, status: p.status }))}
        activeKey={activePhaseKey ?? ""}
        basePath={`/ve/${study.id}`}
      />

      {/* Next-action banner + content-completeness meter */}
      {activePhase && (
        <div className="rounded-xl border border-ve-100 bg-ve-50/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold text-ve-800">Phase {activePhase.order}/8 · {tmpl?.title ?? PHASE_TITLE[activePhase.phase]}</span>
              <span className="text-ink-600">
                {" — "}
                {activeUnmet.length > 0
                  ? `${activeUnmet.length} exit ${activeUnmet.length === 1 ? "criterion" : "criteria"} remaining`
                  : "all exit criteria met — ready to advance"}
              </span>
            </div>
            {tmpl && <a href="#guidance" className="btn-ghost text-xs">Go to phase guidance ↓</a>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-ve-100 pt-2">
            <span className="label mr-1" title="Work objects captured in this study — independent of the phase workflow status above.">
              Content captured {capturedCount}/{completeness.length}
            </span>
            {completeness.map((c) => (
              <span
                key={c.k}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  c.ok ? "bg-green-50 text-green-700" : "bg-ink-100 text-ink-400"
                }`}
              >
                <span className="text-[9px]">{c.ok ? "●" : "○"}</span>
                {c.k}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WorkspaceShell activePhase={activePhaseKey ?? ""} index={wsIndex}>
          {tmpl && activePhase && (
            <WorkspaceSection id="guidance" title="Phase guidance" phases={null}>
            <div className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="label">Phase {activePhase.order} · guidance</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink-900">{tmpl.title}</h2>
                  <p className="mt-1 text-sm text-ink-600">{tmpl.purpose}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={activePhase.status} />
                  <PhaseStatusControl studyId={study.id} phase={activePhase.phase} status={activePhase.status} canEdit={canEdit} />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <GuidanceList title="Key questions" items={(tmpl.keyQuestions as string[]) ?? []} />
                <GuidanceList title="Required inputs" items={tmplContent?.requiredInputs ?? []} />
                <GuidanceList title="Tasks" items={tmplContent?.tasks ?? []} />
                <GuidanceList title="Artifacts to produce" items={tmplContent?.artifacts ?? []} />
              </div>

              <div className="mt-4">
                <ExitCriteriaChecklist
                  kind="VE"
                  id={study.id}
                  phaseKey={activePhase.phase}
                  criteria={exitCriteriaFor("VE", activePhase.phase)}
                  checklist={activePhase.checklist as Record<string, boolean> | null}
                  canEdit={canEdit}
                />
              </div>
              <StarterTextPanel kind="VE" phaseKey={activePhase.phase} industryKey={study.industryKey} />
            </div>
            </WorkspaceSection>
          )}

          <WorkspaceSection id="functions" title="Function model" phases={["FUNCTION_ANALYSIS"]}>
          <FunctionEditor studyId={study.id} functions={study.functions} canEdit={canEdit} currency={study.currency} />
          </WorkspaceSection>

          <WorkspaceSection id="fast" title="FAST diagram" phases={["FUNCTION_ANALYSIS"]}>
          <FastDiagram functions={study.functions} />
          </WorkspaceSection>

          <WorkspaceSection id="alternatives" title="Alternatives" phases={["CREATIVE", "EVALUATION"]}>
          <AlternativeEditor
            studyId={study.id}
            alternatives={study.alternatives}
            functions={study.functions.map((f) => ({ id: f.id, verb: f.verb, noun: f.noun }))}
            recommendations={study.recommendations.map((r) => ({ id: r.id, title: r.title }))}
            aiEnabled={aiEnabled}
            canEdit={canEdit}
          />
          </WorkspaceSection>

          <WorkspaceSection id="evaluation" title="Evaluation" phases={["EVALUATION"]}>
          <EvaluationMatrix
            studyId={study.id}
            criteria={asCriteria(study.evaluationCriteria)}
            alternatives={study.alternatives.map((a) => ({
              id: a.id,
              idea: a.idea,
              scores: asScores(a.scores),
              weightedScore: a.weightedScore,
              shortlisted: a.shortlisted,
            }))}
            canEdit={canEdit}
          />
          </WorkspaceSection>

          <WorkspaceSection id="recommendations" title="Recommendations" phases={["DEVELOPMENT", "HANDOVER"]}>
          <RecommendationEditor
            studyId={study.id}
            recommendations={study.recommendations}
            sourceAlternatives={study.alternatives.reduce((acc, a) => {
              if (a.recommendationId) (acc[a.recommendationId] ??= []).push(a.idea);
              return acc;
            }, {} as Record<string, string[]>)}
            aiEnabled={aiEnabled}
            canEdit={canEdit}
            canDecide={canDecide}
            currency={study.currency}
          />
          </WorkspaceSection>

          <WorkspaceSection id="valuestory" title="Value story" phases={["ORIENTATION", "DEVELOPMENT", "PRESENTATION"]}>
          <ValueStoryEditor
            studyId={study.id}
            canEdit={canEdit}
            whyNow={study.whyNow}
            whyThisSolution={study.whyThisSolution}
            valueStory={(study.valueStory ?? null) as ValueStory | null}
          />
          </WorkspaceSection>

          {study.infoItems.length > 0 && (
            <WorkspaceSection id="baseline" title="Study baseline" phases={["INFORMATION", "HANDOVER"]}>
            <div className="card card-pad">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink-900">Study baseline</h2>
                <span className="label">Information phase</span>
              </div>
              <p className="mt-1 text-sm text-ink-500">
                Baseline measures and stakeholders captured during discovery — the reference the business case and value handover are built on.
              </p>
              {baselineItems.length > 0 && (
                <div className="mt-3">
                  <table className="w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[38%]" />
                      <col className="w-[24%]" />
                      <col className="w-[38%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-ink-400">
                        <th className="pb-2 pr-3 font-medium">Measure</th>
                        <th className="pb-2 pr-3 font-medium">Value</th>
                        <th className="pb-2 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baselineItems.map((it) => (
                        <tr key={it.id} className="border-t border-ink-100 align-top">
                          <td className="py-1.5 pr-3 text-ink-700 break-words">{it.label}</td>
                          <td className="py-1.5 pr-3 font-medium text-ink-900 break-words">{it.value}</td>
                          <td className="py-1.5 text-ink-400 break-words">{it.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {infoStakeholders.length > 0 && (
                <div className="mt-4">
                  <div className="label">Stakeholders</div>
                  <ul className="mt-1.5 space-y-1.5 text-sm">
                    {infoStakeholders.map((it) => (
                      <li key={it.id} className="flex flex-wrap gap-x-2 border-t border-ink-100 pt-1.5">
                        <span className="font-medium text-ink-900">{it.label}</span>
                        <span className="text-ink-600">{it.value}</span>
                        {it.source && <span className="text-ink-400">· {it.source}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            </WorkspaceSection>
          )}

          <WorkspaceSection id="comments" title="Discussion" phases={null}>
          <CommentThread
            entityType="Study"
            entityId={study.id}
            studyId={study.id}
            currentUserId={user.id}
            currentUserRole={user.role}
            comments={study.comments
              .filter((c) => c.entityType === "Study")
              .map((c) => ({ id: c.id, body: c.body, authorId: c.authorId, authorName: c.author.name, createdAt: c.createdAt.toISOString() }))}
          />
          </WorkspaceSection>
          </WorkspaceShell>
        </div>

        {/* Sidebar: business case + handover */}
        <div className="space-y-6">
          <ActivityFeed events={events.map((e) => ({ id: e.id, action: e.action, actor: e.actor?.name ?? null, at: e.createdAt, meta: e.metadata as Record<string, unknown> | null }))} />
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Business case</h2>
            {study.businessCase ? (() => {
              // Recompute live from the same cost/benefit line items as the business-case
              // builder, so the two pages never disagree (and empty financials read "—").
              const bcLines: CashFlowLine[] = (study.businessCase.costItems ?? []).map((c) => ({
                label: c.label,
                kind: c.kind as CashFlowLine["kind"],
                amount: c.amount,
                year: c.year,
                recurring: c.recurring,
              }));
              const fin = computeFinance(bcLines, {
                discountRatePct: study.businessCase.discountRatePct ?? undefined,
                horizonYears: study.businessCase.horizonYears ?? undefined,
              });
              return (
              <dl className="space-y-2 text-sm">
                <Row k="ROI" v={fmtPct(fin.roiPct)} />
                <Row k="Payback" v={fin.paybackMonths != null ? `${fin.paybackMonths.toFixed(1)} mo` : "—"} />
                <Row k="NPV" v={fmtMoney(fin.npv, study.currency)} />
                <Row k="IRR" v={fmtPct(fin.irrPct)} />
                <div className="pt-2">
                  <Link href={`/ve/${study.id}/business-case`} className="btn-ve w-full justify-center">Open builder</Link>
                </div>
              </dl>
              );
            })() : (
              <p className="text-sm text-ink-500">No business case yet.</p>
            )}
          </div>

          <CvrSnapshots
            studyId={study.id}
            canEdit={canEdit}
            snapshots={cvrSnapshots.map((v) => {
              const snap = (v.snapshot ?? {}) as { customerName?: string; roiPct?: string; paybackMonths?: string; npv?: string };
              return {
                id: v.id,
                version: v.version,
                authorName: v.author?.name ?? "—",
                createdAt: v.createdAt.toISOString(),
                meta: { customerName: snap.customerName, roiPct: snap.roiPct, paybackMonths: snap.paybackMonths, npv: snap.npv },
              };
            })}
          />

          {/* Handover / VE→VR bridge */}
          <div className="card card-pad ring-1 ring-vr-100">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-vr-500" />
              <h2 className="font-semibold text-ink-900">Value handover</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {acceptedCount} accepted recommendation{acceptedCount === 1 ? "" : "s"} · {study.handover.length} handover artifacts
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {study.handover.map((h) => (
                <li key={h.id} className="flex gap-2">
                  <span className="badge bg-vr-50 text-vr-700">{h.type.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="text-ink-700">{h.title}</span>
                </li>
              ))}
              {study.handover.length === 0 && <li className="text-ink-400">No handover artifacts yet — draft them in the Development & Handover phases.</li>}
            </ul>
            <div className="mt-4">
              <HandoverButton studyId={study.id} canHandover={canHandover} existingTrackId={study.tracks[0]?.id} />
            </div>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-ink-100 pb-1.5">
      <dt className="text-ink-500">{k}</dt>
      <dd className="font-medium text-ink-900">{v}</dd>
    </div>
  );
}
