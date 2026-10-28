import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge, HealthPill, ProgressBar } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { VR_PHASES } from "@/lib/domain/phases";
import { fmtMoney, fmtPct } from "@/lib/finance";

export const dynamic = "force-dynamic";
export const metadata = { title: "VR Status Report" };

const PHASE_TITLE: Record<string, string> = Object.fromEntries(VR_PHASES.map((p) => [p.key, p.title]));

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

// The current / next milestone for a track: the in-progress phase, else the
// first phase not yet complete, else the last one.
function milestone(track: { status: string; phases: { phase: string; order: number; status: string }[] }) {
  if (track.status === "REALIZED" || track.status === "CLOSED") return "Realised";
  const sorted = [...track.phases].sort((a, b) => a.order - b.order);
  const cur = sorted.find((p) => p.status === "IN_PROGRESS") ?? sorted.find((p) => p.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? (PHASE_TITLE[cur.phase] ?? cur.phase) : "—";
}

export default async function VrStatusReportPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tracks = await prisma.realizationTrack.findMany({
    where: { organizationId: user.organizationId },
    include: {
      industry: true,
      owner: true,
      study: { select: { code: true } },
      phases: true,
      risks: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { workPackages: true, benefits: true } },
    },
    orderBy: [{ health: "asc" }, { createdAt: "desc" }],
  });

  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  // Portfolio roll-ups.
  const health = { GREEN: 0, AMBER: 0, RED: 0 } as Record<string, number>;
  const byStatus = {} as Record<string, number>;
  const byCur = new Map<string, { planned: number; realized: number; count: number }>();
  for (const t of tracks) {
    health[t.health] = (health[t.health] ?? 0) + 1;
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const e = byCur.get(t.currency) ?? { planned: 0, realized: 0, count: 0 };
    e.planned += t.plannedValue ?? 0;
    e.realized += t.realizedValue ?? 0;
    e.count += 1;
    byCur.set(t.currency, e);
  }
  const atRisk = (health.AMBER ?? 0) + (health.RED ?? 0);
  const inFlight = byStatus.IN_FLIGHT ?? 0;
  const currencies = [...byCur.entries()];

  return (
    <div className="space-y-6">
      {/* Controls — hidden in print / PDF */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/vr" className="text-sm text-vr-600 hover:underline">← Value Realisation workspace</Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">Value Realisation — Status Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton className="btn-ghost" />
          <a href="/api/export/vr-status" className="btn-vr">Download (Word) ↓</a>
        </div>
      </div>

      {/* Report body */}
      <div className="space-y-6">
        <div className="border-b border-ink-100 pb-4">
          <div className="text-xs font-medium uppercase tracking-wide text-vr-600">Value Realisation · Portfolio status report</div>
          <h2 className="mt-1 text-2xl font-semibold text-ink-900">{orgName || "Value Realisation tracks"}</h2>
          <p className="mt-1 text-sm text-ink-400">Status across all Value Realisation tracks · generated {fmtDate(new Date())}</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Tracks" value={String(tracks.length)} sub={`${inFlight} in flight`} />
          <Stat label="Health" value={`${health.GREEN ?? 0} green`} sub={`${health.AMBER ?? 0} amber · ${health.RED ?? 0} red`} />
          <Stat label="At risk" value={String(atRisk)} sub="amber + red" />
          <Stat
            label="Value realised"
            value={currencies.length === 1 ? fmtPct(currencies[0][1].planned > 0 ? (currencies[0][1].realized / currencies[0][1].planned) * 100 : 0) : "mixed"}
            sub={currencies.length === 1 ? `${fmtMoney(currencies[0][1].realized, currencies[0][0])} of ${fmtMoney(currencies[0][1].planned, currencies[0][0])}` : `${currencies.length} currencies`}
          />
        </div>

        {/* Value by currency (when more than one) */}
        {currencies.length > 1 && (
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold text-ink-900">Value by currency</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currencies.map(([cur, v]) => {
                const pct = v.planned > 0 ? (v.realized / v.planned) * 100 : 0;
                return (
                  <div key={cur} className="rounded-lg border border-ink-100 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-700">{cur} <span className="text-ink-400">· {v.count} track{v.count === 1 ? "" : "s"}</span></span>
                      <span className="font-semibold text-vr-600">{fmtPct(pct)}</span>
                    </div>
                    <div className="mt-1 text-xs text-ink-400">{fmtMoney(v.realized, cur)} of {fmtMoney(v.planned, cur)}</div>
                    <div className="mt-2"><ProgressBar pct={pct} accent="vr" /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-track status table */}
        <div className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">Tracks ({tracks.length})</div>
          {tracks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">No Value Realisation tracks yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-4 py-2 font-medium">Track</th>
                    <th className="px-3 py-2 font-medium">Health</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 text-right font-medium">Realised / Planned</th>
                    <th className="px-3 py-2 font-medium">% value</th>
                    <th className="px-3 py-2 font-medium">Next milestone</th>
                    <th className="px-3 py-2 text-center font-medium">Open risks</th>
                    <th className="px-3 py-2 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((t) => {
                    const pct = t.plannedValue && t.plannedValue > 0 ? ((t.realizedValue ?? 0) / t.plannedValue) * 100 : 0;
                    const openRisks = t.risks.filter((r) => r.status === "OPEN").length;
                    return (
                      <tr key={t.id} className="border-b border-ink-50 align-top">
                        <td className="px-4 py-3">
                          <Link href={`/vr/${t.id}`} className="font-medium text-ink-900 hover:text-vr-600 hover:underline">{t.title}</Link>
                          <div className="mt-0.5 text-xs text-ink-400">
                            {t.code} · {t.study ? <span className="text-ve-600">from {t.study.code}</span> : <span className="text-vr-600">standalone</span>} · {t.industry.name} · <Link href={`/vr/${t.id}/report`} className="text-vr-600 hover:underline">status report ↓</Link>
                          </div>
                        </td>
                        <td className="px-3 py-3"><HealthPill health={t.health} /></td>
                        <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-3 py-3 text-ink-600">{t.owner.name}</td>
                        <td className="px-3 py-3 text-right text-ink-600 whitespace-nowrap">{fmtMoney(t.realizedValue, t.currency)}<span className="text-ink-300"> / {fmtMoney(t.plannedValue, t.currency)}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2"><span className="w-10 text-xs font-medium text-vr-600">{fmtPct(pct)}</span><div className="w-20"><ProgressBar pct={pct} accent="vr" /></div></div>
                        </td>
                        <td className="px-3 py-3 text-ink-600">{milestone(t)}</td>
                        <td className="px-3 py-3 text-center">{openRisks > 0 ? <span className="badge bg-amber-50 text-amber-700">{openRisks}</span> : <span className="text-ink-300">0</span>}</td>
                        <td className="px-3 py-3 text-ink-600 whitespace-nowrap">{fmtDate(t.targetDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-ink-400">
          Realised value rolls up from benefit actuals; health and status are set per track. For the full plan, KPIs and QBR story of any track, open the track or export its VRP / QBR pack.
        </p>
      </div>
    </div>
  );
}
