import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { buildVrPortfolioDeck, type VrTrackRow } from "@/lib/export/vr-status-deck";
import { VR_PHASES } from "@/lib/domain/phases";

const phaseTitle = (k: string) => VR_PHASES.find((p) => p.key === k)?.title ?? k;
function milestone(t: { status: string; phases: { phase: string; order: number; status: string }[] }) {
  if (t.status === "REALIZED" || t.status === "CLOSED") return "Realised";
  const sorted = [...t.phases].sort((a, b) => a.order - b.order);
  const cur = sorted.find((p) => p.status === "IN_PROGRESS") ?? sorted.find((p) => p.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? phaseTitle(cur.phase) : "—";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracks = await prisma.realizationTrack.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, study: { select: { code: true } }, phases: true, risks: true },
    orderBy: [{ health: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  const health = { GREEN: 0, AMBER: 0, RED: 0 };
  const byStatus: Record<string, number> = {};
  const byCur = new Map<string, { planned: number; realized: number; count: number }>();
  for (const t of tracks) {
    health[t.health as "GREEN" | "AMBER" | "RED"] += 1;
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const e = byCur.get(t.currency) ?? { planned: 0, realized: 0, count: 0 };
    e.planned += t.plannedValue ?? 0; e.realized += t.realizedValue ?? 0; e.count += 1;
    byCur.set(t.currency, e);
  }
  const atRisk = health.AMBER + health.RED;
  const currencies = [...byCur.entries()];
  const single = currencies.length === 1 ? currencies[0] : null;

  const trackRows: VrTrackRow[] = tracks.map((t) => {
    const pct = t.plannedValue && t.plannedValue > 0 ? ((t.realizedValue ?? 0) / t.plannedValue) * 100 : 0;
    return {
      code: t.code, title: t.title,
      origin: t.study ? `from ${t.study.code}` : "standalone",
      health: t.health, status: t.status.replace(/_/g, " ").toLowerCase(),
      realizedPlanned: `${fmtMoney(t.realizedValue, t.currency)} / ${fmtMoney(t.plannedValue, t.currency)}`,
      pct: fmtPct(pct), milestone: milestone(t),
      openRisks: t.risks.filter((r) => r.status === "OPEN").length,
    };
  });

  const attention = tracks.filter((t) => t.health === "RED" || t.health === "AMBER").map((t) => {
    const top = [...t.risks].filter((r) => r.status === "OPEN").sort((a, b) => (b.likelihood ?? 0) * (b.impact ?? 0) - (a.likelihood ?? 0) * (a.impact ?? 0))[0];
    return `${t.health} · ${t.code} ${t.title}${top ? ` — top risk: ${top.title}` : ` — ${milestone(t)}`}`;
  });

  const buf = await buildVrPortfolioDeck({
    orgName, generated: new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    totalTracks: tracks.length, inFlight: byStatus.IN_FLIGHT ?? 0, atRisk, health,
    valueHeadline: single ? fmtPct(single[1].planned > 0 ? (single[1].realized / single[1].planned) * 100 : 0) : "mixed",
    valueSub: single ? `${fmtMoney(single[1].realized, single[0])} of ${fmtMoney(single[1].planned, single[0])}` : `${currencies.length} currencies`,
    currencies: currencies.map(([cur, v]) => ({ currency: cur, realizedPlanned: `${fmtMoney(v.realized, cur)} of ${fmtMoney(v.planned, cur)}`, pct: fmtPct(v.planned > 0 ? (v.realized / v.planned) * 100 : 0), count: v.count })),
    tracks: trackRows, attention,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="VR-Status-Report-${stamp}.pptx"`,
    },
  });
}
