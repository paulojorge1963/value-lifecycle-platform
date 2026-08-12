import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, HealthPill, StatTile } from "@/components/ui";
import { TrackPhaseControl, WorkPackageControl, KpiActualForm, BenefitInput } from "@/components/TrackControls";
import { CommentThread } from "@/components/CommentThread";
import { VR_PHASES } from "@/lib/domain/phases";
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
  const canKpi = can(user.role, "kpi.record");

  const planned = track.plannedValue ?? 0;
  const realized = track.realizedValue ?? 0;
  const variance = planned > 0 ? ((realized - planned) / planned) * 100 : 0;
  const wpDone = track.workPackages.filter((w) => w.status === "DONE").length;
  const onTime = track.workPackages.length > 0 ? (wpDone / track.workPackages.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Link href="/vr" className="hover:text-vr-700">Value Realization</Link>
            <span>/</span>
            <span>{track.code}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{track.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <StatusBadge status={track.status} />
            <HealthPill health={track.health} />
            <span className="badge bg-vr-50 text-vr-700">{track.industry.name}</span>
            <span>· Owner {track.owner.name}</span>
            <span>· Source study{" "}
              <Link href={`/ve/${track.studyId}`} className="text-ve-600 hover:underline">{track.study.code}</Link>
            </span>
          </div>
        </div>
        <a href={`/api/export/vrp/${track.id}`} className="btn-vr">Export VRP / QBR ↓</a>
      </div>

      {/* Value KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Planned value" value={fmtMoney(planned, track.currency)} accent="ve" />
        <StatTile label="Realized value" value={fmtMoney(realized, track.currency)} sub={`${fmtPct((realized / (planned || 1)) * 100)} of plan`} accent="vr" />
        <StatTile label="Variance vs plan" value={fmtPct(variance)} accent={variance >= 0 ? "vr" : "ink"} />
        <StatTile label="On-time implementation" value={fmtPct(onTime)} sub={`${wpDone}/${track.workPackages.length} work pkgs`} accent="vr" />
      </div>

      {/* Phase stepper */}
      <div className="card card-pad">
        <div className="mb-3 label">Value Realization lifecycle</div>
        <div className="flex flex-wrap gap-2">
          {track.phases.sort((a, b) => a.order - b.order).map((p) => {
            const done = p.status === "COMPLETE";
            const active = p.phase === activePhaseKey;
            return (
              <Link
                key={p.phase}
                href={`/vr/${track.id}?phase=${p.phase}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                  active ? "border-vr-400 bg-vr-50 text-vr-700 ring-1 ring-vr-300" : done ? "border-transparent bg-vr-50 text-vr-700" : "border-ink-200 bg-white text-ink-500"
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${done ? "bg-vr-600" : p.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-ink-300"}`}>
                  {p.order}
                </span>
                {PHASE_TITLE[p.phase]}
              </Link>
            );
          })}
        </div>
      </div>

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
              <div className="mt-4 rounded-lg bg-ink-50 p-4">
                <div className="label">Exit criteria</div>
                <ul className="mt-2 space-y-1 text-sm text-ink-700">
                  {(tmplContent?.exitCriteria ?? []).map((c, i) => (
                    <li key={i} className="flex gap-2"><span className="text-vr-500">✓</span>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Work packages */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Implementation work packages</h2>
            <table className="w-full">
              <thead className="border-b border-ink-200"><tr>
                <th className="th">Work package</th><th className="th">From rec</th><th className="th">Due</th><th className="th">Status</th><th className="th"></th>
              </tr></thead>
              <tbody className="divide-y divide-ink-100">
                {track.workPackages.map((w) => (
                  <tr key={w.id}>
                    <td className="td font-medium">{w.name}{w.isMilestone && <span className="ml-1.5 badge bg-amber-100 text-amber-700">milestone</span>}</td>
                    <td className="td text-xs text-ink-400">{w.recommendation?.title ?? "—"}</td>
                    <td className="td text-xs">{w.dueDate ? new Date(w.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="td"><StatusBadge status={w.status} /></td>
                    <td className="td text-right"><WorkPackageControl id={w.id} trackId={track.id} status={w.status} canEdit={canEdit} /></td>
                  </tr>
                ))}
                {track.workPackages.length === 0 && <tr><td className="td text-ink-400" colSpan={5}>No work packages.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* KPI tracker */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">KPI tracker — planned vs actual</h2>
            <div className="space-y-4">
              {track.kpiTargets.map((k) => {
                const latest = k.actuals[k.actuals.length - 1];
                return (
                  <div key={k.id} className="rounded-lg border border-ink-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink-900">{k.definition.name}</div>
                        <div className="text-xs text-ink-400">
                          Baseline {k.baselineValue ?? "—"} → Target {k.targetValue ?? "—"} {k.unit} · {k.dataSource ?? "—"} · {k.frequency ?? "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="label">Latest</div>
                        <div className="text-lg font-semibold text-vr-700">{latest ? `${latest.value} ${k.unit}` : "—"}</div>
                      </div>
                    </div>
                    {k.actuals.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {k.actuals.map((a) => (
                          <span key={a.id} className="rounded bg-ink-100 px-2 py-0.5 text-ink-600">{a.periodLabel}: {a.value}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3"><KpiActualForm trackId={track.id} kpiTargetId={k.id} unit={k.unit} canEdit={canKpi} /></div>
                  </div>
                );
              })}
              {track.kpiTargets.length === 0 && <p className="text-sm text-ink-500">No KPIs yet — defined during the Baseline phase or carried from handover.</p>}
            </div>
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
          {/* Benefits realization */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Benefits realization</h2>
            <div className="space-y-4">
              {track.benefits.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-ink-800">{b.label}</span>
                    <span className="text-ink-500">{fmtMoney(b.realizedValue)} / {fmtMoney(b.plannedValue)}</span>
                  </div>
                  <div className="mt-1.5"><BenefitInput id={b.id} trackId={track.id} planned={b.plannedValue} realized={b.realizedValue} canEdit={canKpi} /></div>
                </div>
              ))}
              {track.benefits.length === 0 && <p className="text-sm text-ink-500">No benefits tracked.</p>}
            </div>
          </div>

          {/* Adoption plan */}
          {track.adoptionPlan && (
            <div className="card card-pad">
              <h2 className="mb-2 font-semibold text-ink-900">Adoption & change</h2>
              {track.adoptionPlan.changeImpact && <p className="text-sm text-ink-600">{track.adoptionPlan.changeImpact}</p>}
              <ul className="mt-3 space-y-1.5 text-sm">
                {track.adoptionPlan.activities.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span className="text-ink-700">{a.label}</span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}

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
