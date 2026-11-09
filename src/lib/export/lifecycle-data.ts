// =============================================================================
//  Shared aggregation for the combined Value Lifecycle status report.
//  Used by the Word route, the PPTX route and the on-screen report page so the
//  three always agree. Single reporting currency (prevailing study currency),
//  matching the Portfolio page's simplification.
// =============================================================================
import { prisma } from "@/lib/db";
import { fmtMoney, DEFAULT_CURRENCY } from "@/lib/finance";

const DAY = 86400000;

export interface LifecycleData {
  orgName: string;
  reportCurrency: string;
  ve: { total: number; active: number; approved: number; atGate: number; planned: number };
  vr: { total: number; inFlight: number; realized: number; plannedInTracks: number; atRisk: number; health: { GREEN: number; AMBER: number; RED: number } };
  cs: { total: number; arr: number; renewalsDue: number; atRisk: number; health: { GREEN: number; AMBER: number; RED: number } };
  attention: string[];
}

export async function gatherLifecycle(organizationId: string): Promise<LifecycleData> {
  const [studies, tracks, engagements, org] = await Promise.all([
    prisma.study.findMany({ where: { organizationId }, select: { code: true, title: true, customerName: true, status: true, estimatedValue: true, currency: true } }),
    prisma.realizationTrack.findMany({ where: { organizationId }, select: { code: true, title: true, status: true, health: true, plannedValue: true, realizedValue: true, currency: true } }),
    prisma.customerSuccessEngagement.findMany({ where: { organizationId }, select: { code: true, accountName: true, status: true, healthOverall: true, arr: true, currency: true, renewalDate: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
  ]);

  const reportCurrency = studies[0]?.currency ?? tracks[0]?.currency ?? engagements[0]?.currency ?? DEFAULT_CURRENCY;
  const now = Date.now();

  const ve = {
    total: studies.length,
    active: studies.filter((s) => !["ARCHIVED", "REJECTED"].includes(s.status)).length,
    approved: studies.filter((s) => s.status === "APPROVED").length,
    atGate: studies.filter((s) => s.status === "IN_REVIEW").length,
    planned: studies.reduce((a, s) => a + (s.estimatedValue ?? 0), 0),
  };

  const vrHealth = { GREEN: 0, AMBER: 0, RED: 0 } as Record<string, number>;
  tracks.forEach((t) => { vrHealth[t.health] = (vrHealth[t.health] ?? 0) + 1; });
  const vr = {
    total: tracks.length,
    inFlight: tracks.filter((t) => t.status === "IN_FLIGHT").length,
    realized: tracks.reduce((a, t) => a + (t.realizedValue ?? 0), 0),
    plannedInTracks: tracks.reduce((a, t) => a + (t.plannedValue ?? 0), 0),
    atRisk: (vrHealth.AMBER ?? 0) + (vrHealth.RED ?? 0),
    health: { GREEN: vrHealth.GREEN ?? 0, AMBER: vrHealth.AMBER ?? 0, RED: vrHealth.RED ?? 0 },
  };

  const csHealth = { GREEN: 0, AMBER: 0, RED: 0 } as Record<string, number>;
  engagements.forEach((e) => { csHealth[e.healthOverall] = (csHealth[e.healthOverall] ?? 0) + 1; });
  const renewalsDue = engagements.filter((e) => {
    if (!e.renewalDate) return false;
    const days = (new Date(e.renewalDate).getTime() - now) / DAY;
    return days >= 0 && days <= 90;
  }).length;
  const cs = {
    total: engagements.length,
    arr: engagements.reduce((a, e) => a + (e.arr ?? 0), 0),
    renewalsDue,
    atRisk: (csHealth.AMBER ?? 0) + (csHealth.RED ?? 0),
    health: { GREEN: csHealth.GREEN ?? 0, AMBER: csHealth.AMBER ?? 0, RED: csHealth.RED ?? 0 },
  };

  // Combined attention list — a few from each pillar.
  const attention: string[] = [
    ...studies.filter((s) => s.status === "IN_REVIEW").slice(0, 3).map((s) =>
      `VE · ${s.code} ${s.title}${s.customerName ? ` (${s.customerName})` : ""} at the decision gate — ${fmtMoney(s.estimatedValue, s.currency)}`),
    ...tracks.filter((t) => t.health === "RED" || t.health === "AMBER").slice(0, 3).map((t) =>
      `VR · ${t.health} ${t.code} ${t.title}`),
    ...engagements.filter((e) => {
      const soon = e.renewalDate && (() => { const dy = (new Date(e.renewalDate!).getTime() - now) / DAY; return dy >= 0 && dy <= 90; })();
      return e.healthOverall !== "GREEN" || soon;
    }).slice(0, 4).map((e) =>
      `CS · ${e.healthOverall} ${e.code} ${e.accountName}${e.renewalDate ? ` — renewal ${new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(e.renewalDate))}` : ""}`),
  ];

  return { orgName: org?.name ?? "", reportCurrency, ve, vr, cs, attention };
}
