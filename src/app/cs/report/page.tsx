import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge, HealthPill } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { CS_STAGES } from "@/lib/domain/cs-stages";
import { fmtMoney } from "@/lib/finance";

export const dynamic = "force-dynamic";
export const metadata = { title: "CS Status Report" };

const STAGE_TITLE: Record<string, string> = Object.fromEntries(CS_STAGES.map((s) => [s.key, s.title]));

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
function currentStage(e: { stages: { stage: string; order: number; status: string }[] }) {
  const sorted = [...e.stages].sort((a, b) => a.order - b.order);
  const cur = sorted.find((s) => s.status === "IN_PROGRESS") ?? sorted.find((s) => s.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? (STAGE_TITLE[cur.stage] ?? cur.stage) : "—";
}
const DAY = 86400000;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-ink-400">{sub}</div> : null}
    </div>
  );
}

export default async function CsStatusReportPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const engagements = await prisma.customerSuccessEngagement.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, owner: true, stages: true, actions: true },
    orderBy: [{ healthOverall: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  const health = { GREEN: 0, AMBER: 0, RED: 0 } as Record<string, number>;
  const byCur = new Map<string, { total: number; count: number }>();
  let renewalsDue = 0;
  const now = Date.now();
  for (const e of engagements) {
    health[e.healthOverall] = (health[e.healthOverall] ?? 0) + 1;
    if (e.arr && e.arr > 0) {
      const c = byCur.get(e.currency) ?? { total: 0, count: 0 };
      c.total += e.arr; c.count += 1;
      byCur.set(e.currency, c);
    }
    if (e.renewalDate) {
      const days = (new Date(e.renewalDate).getTime() - now) / DAY;
      if (days >= 0 && days <= 90) renewalsDue += 1;
    }
  }
  const atRisk = (health.AMBER ?? 0) + (health.RED ?? 0);
  const currencies = [...byCur.entries()];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/cs" className="text-sm text-vr-600 hover:underline">← Customer Success workspace</Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">Customer Success — Status Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton className="btn-ghost" />
          <a href="/api/export/cs-status/pptx" className="btn-ghost">PPTX ↓</a>
          <a href="/api/export/cs-status" className="btn-vr">Download (Word) ↓</a>
        </div>
      </div>

      <div className="space-y-6">
        <div className="border-b border-ink-100 pb-4">
          <div className="text-xs font-medium uppercase tracking-wide text-vr-600">Customer Success · Portfolio health report</div>
          <h2 className="mt-1 text-2xl font-semibold text-ink-900">{orgName || "Customer Success engagements"}</h2>
          <p className="mt-1 text-sm text-ink-400">Health and renewal status across all engagements · generated {fmtDate(new Date())}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Engagements" value={String(engagements.length)} sub={`${health.GREEN ?? 0} healthy`} />
          <Stat label="Health" value={`${health.GREEN ?? 0} green`} sub={`${health.AMBER ?? 0} amber · ${health.RED ?? 0} red`} />
          <Stat label="At risk" value={String(atRisk)} sub="amber + red" />
          <Stat label="Renewals due" value={String(renewalsDue)} sub="within 90 days" />
        </div>

        {currencies.length >= 1 && (
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold text-ink-900">ARR under management</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currencies.map(([cur, v]) => (
                <div key={cur} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-700">{cur} <span className="text-ink-400">· {v.count} acct{v.count === 1 ? "" : "s"}</span></span>
                    <span className="font-semibold text-vr-600">{fmtMoney(v.total, cur)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3 text-sm font-semibold text-ink-900">Engagements ({engagements.length})</div>
          {engagements.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-400">No Customer Success engagements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-4 py-2 font-medium">Engagement</th>
                    <th className="px-3 py-2 font-medium">Health</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 text-right font-medium">ARR</th>
                    <th className="px-3 py-2 font-medium">Renewal</th>
                    <th className="px-3 py-2 text-center font-medium">Open actions</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {engagements.map((e) => {
                    const openActions = e.actions.filter((a) => a.status !== "DONE").length;
                    return (
                      <tr key={e.id} className="border-b border-ink-50 align-top">
                        <td className="px-4 py-3">
                          <Link href={`/cs/${e.id}`} className="font-medium text-ink-900 hover:text-vr-600 hover:underline">{e.accountName}</Link>
                          <div className="mt-0.5 text-xs text-ink-400">{e.code} · {e.industry.name}</div>
                        </td>
                        <td className="px-3 py-3"><HealthPill health={e.healthOverall} /></td>
                        <td className="px-3 py-3"><StatusBadge status={e.status} /></td>
                        <td className="px-3 py-3 text-ink-600">{currentStage(e)}</td>
                        <td className="px-3 py-3 text-right text-ink-600 whitespace-nowrap">{fmtMoney(e.arr, e.currency)}</td>
                        <td className="px-3 py-3 text-ink-600 whitespace-nowrap">{fmtDate(e.renewalDate)}</td>
                        <td className="px-3 py-3 text-center">{openActions > 0 ? <span className="badge bg-amber-50 text-amber-700">{openActions}</span> : <span className="text-ink-300">0</span>}</td>
                        <td className="px-3 py-3 text-ink-600">{e.owner.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-ink-400">
          Health is set per engagement; renewal and ARR come from the engagement record. Open an engagement for its success plan, health history and renewal plan.
        </p>
      </div>
    </div>
  );
}
