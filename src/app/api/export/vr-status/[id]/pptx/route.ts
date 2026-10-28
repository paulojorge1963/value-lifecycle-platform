import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { buildVrTrackDeck } from "@/lib/export/vr-status-deck";
import { VR_PHASES } from "@/lib/domain/phases";

const phaseTitle = (k: string) => VR_PHASES.find((p) => p.key === k)?.title ?? k;
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const track = await prisma.realizationTrack.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      industry: true, owner: true, study: { select: { code: true } }, phases: true,
      workPackages: { orderBy: { order: "asc" }, include: { recommendation: { select: { title: true } } } },
      benefits: true,
      kpiTargets: { include: { definition: true, actuals: { orderBy: { periodDate: "asc" } } } },
      risks: true,
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cur = track.currency;

  const phases = [...track.phases].sort((a, b) => a.order - b.order);
  const done = phases.filter((p) => p.status === "COMPLETE").length;
  const current = phases.find((p) => p.status === "IN_PROGRESS") ?? phases.find((p) => p.status !== "COMPLETE") ?? phases[phases.length - 1];
  const planned = track.plannedValue ?? 0, realized = track.realizedValue ?? 0;
  const valuePct = planned > 0 ? (realized / planned) * 100 : 0;
  const openRisks = [...track.risks].filter((r) => r.status === "OPEN").sort((a, b) => (b.likelihood ?? 0) * (b.impact ?? 0) - (a.likelihood ?? 0) * (a.impact ?? 0));
  const qbr = track.reports[0]?.content as { executiveStory?: string; nextBestActions?: string[] | string; expansion?: string } | undefined;
  const nextActions: string[] = Array.isArray(qbr?.nextBestActions) ? qbr!.nextBestActions as string[] : (qbr?.nextBestActions ? [qbr.nextBestActions as string] : []);

  const buf = await buildVrTrackDeck({
    orgName: (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "",
    generated: fmtDate(new Date()),
    code: track.code, title: track.title, origin: track.study ? `from ${track.study.code}` : "standalone",
    owner: track.owner.name, industry: track.industry.name,
    health: track.health, status: track.status.replace(/_/g, " ").toLowerCase(),
    valueHeadline: fmtPct(valuePct), valueSub: `${fmtMoney(realized, cur)} of ${fmtMoney(planned, cur)}`,
    phaseDone: done, phaseTotal: phases.length, currentPhase: current ? phaseTitle(current.phase) : "—",
    openRisks: openRisks.length, targetDate: fmtDate(track.targetDate),
    objectives: track.objectives ?? undefined, successCriteria: track.successCriteria ?? undefined,
    phases: phases.map((ph) => ({ order: ph.order, title: phaseTitle(ph.phase), status: ph.status, current: ph.id === current?.id })),
    kpis: track.kpiTargets.map((k) => {
      const latest = k.actuals[k.actuals.length - 1];
      return { name: k.definition.name, baseline: k.baselineValue != null ? `${k.baselineValue} ${k.unit}` : "—", target: k.targetValue != null ? `${k.targetValue} ${k.unit}` : "—", latest: latest ? `${latest.value} ${k.unit}` : "—", source: k.dataSource ?? "—" };
    }),
    workPackages: track.workPackages.map((w) => ({ name: w.name, from: w.recommendation?.title ?? "—", due: fmtDate(w.dueDate), status: w.status.replace(/_/g, " ").toLowerCase() })),
    benefits: track.benefits.map((b) => ({ label: b.label, realizedPlanned: `${fmtMoney(b.realizedValue, b.currency)} of ${fmtMoney(b.plannedValue, b.currency)}`, pct: fmtPct(b.plannedValue > 0 ? (b.realizedValue / b.plannedValue) * 100 : 0) })),
    risks: openRisks.map((r) => ({ sev: String((r.likelihood ?? 0) * (r.impact ?? 0) || "—"), title: r.title, mitigation: r.mitigation ?? undefined })),
    qbrStory: qbr?.executiveStory ?? undefined, nextActions, expansion: qbr?.expansion,
  });

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${track.code}-status-report.pptx"`,
    },
  });
}
