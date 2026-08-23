import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatTile, StatusBadge, HealthPill, Money, SectionHeader, ProgressBar } from "@/components/ui";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { computeSignals, attentionScore } from "@/lib/cs-signals";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await getCurrentUser();
  if (!user) return <NoData />;

  const [studies, tracks, industries, engagements] = await Promise.all([
    prisma.study.findMany({
      where: { organizationId: user.organizationId },
      include: { industry: true, businessCase: true, phases: true, tracks: true, _count: { select: { recommendations: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.realizationTrack.findMany({
      where: { organizationId: user.organizationId },
      include: { industry: true, study: true, benefits: true, phases: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.industryProfile.findMany(),
    prisma.customerSuccessEngagement.findMany({
      where: { organizationId: user.organizationId },
      include: {
        actions: { select: { dueDate: true, status: true } },
        stakeholders: { select: { sentiment: true } },
        tracks: { select: { plannedValue: true, realizedValue: true } },
      },
      orderBy: { renewalDate: "asc" },
    }),
  ]);

  const attention = engagements
    .map((e) => ({ e, signals: computeSignals({ status: e.status, healthOverall: e.healthOverall, renewalDate: e.renewalDate, actions: e.actions, stakeholders: e.stakeholders, tracks: e.tracks }) }))
    .filter((x) => x.signals.length > 0)
    .sort((a, b) => attentionScore(b.signals) - attentionScore(a.signals));

  // Customer Success lens
  const activeEngagements = engagements.filter((e) => !["ARCHIVED", "CHURNED"].includes(e.status)).length;
  const health = { GREEN: 0, AMBER: 0, RED: 0 } as Record<string, number>;
  engagements.forEach((e) => { health[e.healthOverall] = (health[e.healthOverall] ?? 0) + 1; });
  const upcomingRenewals = engagements
    .filter((e) => e.renewalDate && new Date(e.renewalDate).getTime() - Date.now() < 120 * 86400000 && !["CHURNED", "ARCHIVED"].includes(e.status))
    .slice(0, 6);

  const plannedTotal = studies.reduce((s, x) => s + (x.estimatedValue ?? 0), 0);
  const realizedTotal = tracks.reduce((s, x) => s + (x.realizedValue ?? 0), 0);
  const plannedInTracks = tracks.reduce((s, x) => s + (x.plannedValue ?? 0), 0);
  const activeStudies = studies.filter((s) => !["ARCHIVED", "REJECTED"].includes(s.status)).length;
  const activeTracks = tracks.filter((t) => ["PLANNING", "IN_FLIGHT", "ON_HOLD"].includes(t.status)).length;
  const realizationPct = plannedInTracks > 0 ? (realizedTotal / plannedInTracks) * 100 : 0;

  // By-industry rollup
  const byIndustry = industries.map((ind) => {
    const iStudies = studies.filter((s) => s.industryKey === ind.key);
    const iTracks = tracks.filter((t) => t.industryKey === ind.key);
    return {
      key: ind.key,
      name: ind.name,
      planned: iStudies.reduce((s, x) => s + (x.estimatedValue ?? 0), 0),
      realized: iTracks.reduce((s, x) => s + (x.realizedValue ?? 0), 0),
      studies: iStudies.length,
      tracks: iTracks.length,
    };
  });

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Value Portfolio"
        desc="Combined view for leaders — planned value from VE studies, realized value from VR tracks."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active VE studies" value={String(activeStudies)} sub={`${studies.length} total`} accent="ve" />
        <StatTile label="Active VR tracks" value={String(activeTracks)} sub={`${tracks.length} total`} accent="vr" />
        <StatTile label="Planned value (VE)" value={fmtMoney(plannedTotal)} sub="Estimated across studies" accent="ve" />
        <StatTile label="Realized value (VR)" value={fmtMoney(realizedTotal)} sub={`${fmtPct(realizationPct)} of tracked plan`} accent="vr" />
      </div>

      {/* Planned vs realized bar */}
      <div className="card card-pad">
        <div className="flex items-center justify-between">
          <span className="label">Realized vs planned (tracks in flight)</span>
          <span className="text-sm font-medium text-ink-700">
            {fmtMoney(realizedTotal)} / {fmtMoney(plannedInTracks)}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar pct={realizationPct} accent="vr" />
        </div>
      </div>

      {/* Customer Success lens */}
      {engagements.length > 0 && (
        <div>
          <SectionHeader
            title="Customer Success"
            action={<Link href="/cs" className="text-sm font-medium text-vr-700 hover:underline">Open workspace →</Link>}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card card-pad">
              <div className="label">Active engagements</div>
              <div className="mt-1 text-2xl font-bold text-ink-900">{activeEngagements}</div>
              <div className="text-xs text-ink-500">{engagements.length} total</div>
            </div>
            <div className="card card-pad">
              <div className="label">Health</div>
              <div className="mt-2 flex gap-3 text-sm">
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">● {health.GREEN} green</span>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">● {health.AMBER} amber</span>
                <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">● {health.RED} red</span>
              </div>
            </div>
            <div className="card card-pad">
              <div className="label">Upcoming renewals (120 days)</div>
              {upcomingRenewals.length === 0 ? (
                <p className="mt-1 text-sm text-ink-400">None</p>
              ) : (
                <ul className="mt-1.5 space-y-1 text-sm">
                  {upcomingRenewals.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <Link href={`/cs/${e.id}`} className="text-ink-700 hover:text-vr-700">{e.accountName}</Link>
                      <span className="text-ink-400">{e.renewalDate ? new Date(e.renewalDate).toLocaleDateString() : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CS needs-attention */}
      {attention.length > 0 && (
        <div className="card card-pad">
          <div className="label">Customer Success — needs attention</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {attention.slice(0, 8).map(({ e, signals }) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/cs/${e.id}`} className="font-medium text-ink-800 hover:text-vr-700">{e.accountName}</Link>
                <span className="flex flex-wrap gap-1">
                  {signals.slice(0, 4).map((s, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${s.level === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{s.label}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* By industry */}
      <div>
        <SectionHeader title="By solution" />
        <div className="grid gap-4 md:grid-cols-3">
          {byIndustry.map((i) => (
            <div key={i.key} className="card card-pad">
              <div className="font-medium text-ink-900">{i.name}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="label">Planned</div>
                  <div className="font-semibold text-ve-700">{fmtMoney(i.planned)}</div>
                </div>
                <div>
                  <div className="label">Realized</div>
                  <div className="font-semibold text-vr-700">{fmtMoney(i.realized)}</div>
                </div>
                <div className="text-xs text-ink-500">{i.studies} studies</div>
                <div className="text-xs text-ink-500">{i.tracks} tracks</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Studies + tracks tables */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHeader
            title="VE studies"
            action={<Link href="/ve" className="text-sm font-medium text-ve-700 hover:underline">Open workspace →</Link>}
          />
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>
                  <th className="th">Study</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Planned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {studies.map((s) => {
                  const done = s.phases.filter((p) => p.status === "COMPLETE").length;
                  return (
                    <tr key={s.id} className="hover:bg-ink-50">
                      <td className="td">
                        <Link href={`/ve/${s.id}`} className="font-medium text-ink-900 hover:text-ve-700">
                          {s.title}
                        </Link>
                        <div className="text-xs text-ink-400">
                          {s.code} · {s.industry.name} · phase {done}/8
                          {s.tracks.length > 0 && <span className="text-vr-600"> · {s.tracks.length} VR track</span>}
                        </div>
                      </td>
                      <td className="td"><StatusBadge status={s.status} /></td>
                      <td className="td text-right"><Money value={s.estimatedValue} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionHeader
            title="VR tracks"
            action={<Link href="/vr" className="text-sm font-medium text-vr-700 hover:underline">Open workspace →</Link>}
          />
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-ink-200 bg-ink-50">
                <tr>
                  <th className="th">Track</th>
                  <th className="th">Health</th>
                  <th className="th text-right">Realized / Planned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {tracks.map((t) => (
                  <tr key={t.id} className="hover:bg-ink-50">
                    <td className="td">
                      <Link href={`/vr/${t.id}`} className="font-medium text-ink-900 hover:text-vr-700">
                        {t.title}
                      </Link>
                      <div className="text-xs text-ink-400">
                        {t.code} ·{" "}
                        {t.study ? (
                          <>from <span className="text-ve-600">{t.study.code}</span></>
                        ) : (
                          <span className="text-vr-600">standalone</span>
                        )}
                      </div>
                    </td>
                    <td className="td"><HealthPill health={t.health} /></td>
                    <td className="td text-right text-sm">
                      <span className="font-medium text-vr-700">{fmtMoney(t.realizedValue)}</span>
                      <span className="text-ink-400"> / {fmtMoney(t.plannedValue)}</span>
                    </td>
                  </tr>
                ))}
                {tracks.length === 0 && (
                  <tr><td className="td text-ink-400" colSpan={3}>No realization tracks yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoData() {
  return (
    <div className="card card-pad">
      <p className="text-ink-600">No data yet. Run <code className="rounded bg-ink-100 px-1">npm run db:seed</code> to load demo studies and tracks.</p>
    </div>
  );
}
