import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, HealthPill, StatTile } from "@/components/ui";
import { CsStageControl, CsHealthControl, LinkPicker, UnlinkButton } from "@/components/CsControls";
import { CS_STAGES, CS_STAGE_TITLE } from "@/lib/domain/cs-stages";
import { fmtMoney, fmtPct } from "@/lib/finance";

export const dynamic = "force-dynamic";

const STAGE_BY_KEY = Object.fromEntries(CS_STAGES.map((s) => [s.key, s]));

export default async function EngagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { id } = await params;
  const { stage: stageParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const e = await prisma.customerSuccessEngagement.findUnique({
    where: { id },
    include: {
      industry: true,
      owner: true,
      stages: true,
      studies: { include: { businessCase: true }, orderBy: { createdAt: "desc" } },
      tracks: { include: { study: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!e) notFound();

  const canEdit = can(user.role, "cs.edit");

  // Unlinked studies/tracks in this org, available to attach.
  const [freeStudies, freeTracks] = await Promise.all([
    prisma.study.findMany({ where: { organizationId: user.organizationId, engagementId: null }, select: { id: true, code: true, title: true }, orderBy: { createdAt: "desc" } }),
    prisma.realizationTrack.findMany({ where: { organizationId: user.organizationId, engagementId: null }, select: { id: true, code: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const plannedValue = e.tracks.reduce((s, t) => s + (t.plannedValue ?? 0), 0);
  const realizedValue = e.tracks.reduce((s, t) => s + (t.realizedValue ?? 0), 0);
  const rd = e.renewalDate ? Math.round((new Date(e.renewalDate).getTime() - Date.now()) / 86400000) : null;

  const activeKey =
    stageParam ||
    e.stages.find((s) => s.status === "IN_PROGRESS")?.stage ||
    e.stages.sort((a, b) => a.order - b.order).find((s) => s.status !== "COMPLETE")?.stage ||
    e.stages[0]?.stage;
  const activeInst = e.stages.find((s) => s.stage === activeKey);
  const activeDef = activeKey ? STAGE_BY_KEY[activeKey] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Link href="/cs" className="hover:text-vr-700">Customer Success</Link>
            <span>/</span>
            <span>{e.code}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{e.accountName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <StatusBadge status={e.status} />
            <HealthPill health={e.healthOverall} />
            <span className="badge bg-vr-50 text-vr-700">{e.industry.name}</span>
            <span>· CSM {e.owner.name}</span>
            {e.renewalDate && <span className={rd !== null && rd < 90 ? "text-amber-700" : ""}>· Renewal {new Date(e.renewalDate).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CsHealthControl engagementId={e.id} health={e.healthOverall} canEdit={canEdit} />
        </div>
      </div>

      {/* Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="ARR" value={e.arr ? fmtMoney(e.arr, e.currency) : "—"} accent="vr" />
        <StatTile label="Planned value (linked)" value={fmtMoney(plannedValue, e.currency)} accent="ve" />
        <StatTile label="Realized value (linked)" value={fmtMoney(realizedValue, e.currency)} sub={`${fmtPct((realizedValue / (plannedValue || 1)) * 100)} of plan`} accent="vr" />
        <StatTile label="Renewal" value={rd !== null ? `${rd} days` : "—"} sub={e.renewalDate ? new Date(e.renewalDate).toLocaleDateString() : "not set"} accent={rd !== null && rd < 90 ? "ink" : "vr"} />
      </div>

      {/* Stage stepper */}
      <div className="card card-pad">
        <div className="mb-3 label">Customer Success lifecycle</div>
        <div className="flex flex-wrap gap-2">
          {e.stages.sort((a, b) => a.order - b.order).map((s) => {
            const done = s.status === "COMPLETE";
            const active = s.stage === activeKey;
            return (
              <Link
                key={s.stage}
                href={`/cs/${e.id}?stage=${s.stage}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                  active ? "border-vr-400 bg-vr-50 text-vr-700 ring-1 ring-vr-300" : done ? "border-transparent bg-vr-50 text-vr-700" : "border-ink-200 bg-white text-ink-500"
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${done ? "bg-vr-600" : s.status === "IN_PROGRESS" ? "bg-amber-500" : "bg-ink-300"}`}>
                  {s.order}
                </span>
                {CS_STAGE_TITLE[s.stage]}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Stage guidance */}
          {activeDef && activeInst && (
            <div className="card card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="label">Stage {activeDef.order} · guidance</div>
                  <h2 className="mt-1 text-lg font-semibold text-ink-900">{activeDef.title}</h2>
                  <p className="mt-1 text-sm text-ink-600">{activeDef.objective}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={activeInst.status} />
                  <CsStageControl engagementId={e.id} stage={activeInst.stage} status={activeInst.status} canEdit={canEdit} />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <GuidanceList title="Key activities" items={activeDef.keyActivities} />
                <div>
                  <div className="label">Exit criteria</div>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink-700">
                    {activeDef.exitCriteria.map((c, i) => <li key={i} className="flex gap-2"><span className="text-vr-500">✓</span>{c}</li>)}
                  </ul>
                  <div className="mt-3 label">Primary output</div>
                  <p className="mt-1 text-sm text-ink-700">{activeDef.output}</p>
                </div>
              </div>
            </div>
          )}

          {/* Linked VR tracks */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Linked Value Realization tracks</h2>
            <div className="space-y-2">
              {e.tracks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 p-3">
                  <div>
                    <Link href={`/vr/${t.id}`} className="font-medium text-ink-900 hover:text-vr-700">{t.code} · {t.title}</Link>
                    <div className="text-xs text-ink-400">
                      {fmtMoney(t.realizedValue ?? 0, t.currency)} / {fmtMoney(t.plannedValue ?? 0, t.currency)} realized · <StatusBadgeInline s={t.status} />
                    </div>
                  </div>
                  {canEdit && <UnlinkButton engagementId={e.id} id={t.id} kind="track" />}
                </div>
              ))}
              {e.tracks.length === 0 && <p className="text-sm text-ink-500">No tracks linked yet.</p>}
            </div>
            <LinkPicker engagementId={e.id} kind="track" canEdit={canEdit} options={freeTracks.map((t) => ({ id: t.id, label: `${t.code} · ${t.title}` }))} />
          </div>

          {/* Linked VE studies */}
          <div className="card card-pad">
            <h2 className="mb-3 font-semibold text-ink-900">Linked Value Engineering studies</h2>
            <div className="space-y-2">
              {e.studies.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 p-3">
                  <div>
                    <Link href={`/ve/${s.id}`} className="font-medium text-ink-900 hover:text-ve-700">{s.code} · {s.title}</Link>
                    <div className="text-xs text-ink-400">
                      {s.estimatedValue ? `${fmtMoney(s.estimatedValue, s.currency)} est. value` : "—"}
                      {s.businessCase?.roiPct != null ? ` · ROI ${fmtPct(s.businessCase.roiPct)}` : ""} · <StatusBadgeInline s={s.status} />
                    </div>
                  </div>
                  {canEdit && <UnlinkButton engagementId={e.id} id={s.id} kind="study" />}
                </div>
              ))}
              {e.studies.length === 0 && <p className="text-sm text-ink-500">No studies linked yet.</p>}
            </div>
            <LinkPicker engagementId={e.id} kind="study" canEdit={canEdit} options={freeStudies.map((s) => ({ id: s.id, label: `${s.code} · ${s.title}` }))} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card card-pad">
            <div className="label">Objectives</div>
            <p className="mt-1 text-sm text-ink-700">{e.objectives ?? "—"}</p>
          </div>
          <div className="card card-pad">
            <div className="label">About this engagement</div>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row k="Account" v={e.accountName} />
              <Row k="Status" v={e.status} />
              <Row k="CSM" v={e.owner.name} />
              <Row k="ARR" v={e.arr ? fmtMoney(e.arr, e.currency) : "—"} />
              <Row k="Renewal" v={e.renewalDate ? new Date(e.renewalDate).toLocaleDateString() : "—"} />
              <Row k="Started" v={e.startedAt ? new Date(e.startedAt).toLocaleDateString() : "—"} />
            </dl>
          </div>
          <div className="card card-pad text-xs text-ink-400">
            Customer Success is the continuous, whole-relationship layer. Value data lives on the linked VR tracks — this view surfaces it, it doesn't duplicate it.
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
        {items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-ink-300">•</span>{it}</li>)}
      </ul>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-ink-400">{k}</dt><dd className="text-ink-800">{v}</dd></div>;
}
function StatusBadgeInline({ s }: { s: string }) {
  return <span className="text-ink-500">{s.replaceAll("_", " ").toLowerCase()}</span>;
}
