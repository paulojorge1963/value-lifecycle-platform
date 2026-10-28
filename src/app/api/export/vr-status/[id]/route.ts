import { NextRequest, NextResponse } from "next/server";
import { Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from "docx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { brandedDoc } from "@/lib/export/doc-template";
import { VR_PHASES } from "@/lib/domain/phases";

// Per-track Value Realisation Status Report (Word .docx) — a status snapshot
// (the fuller plan + QBR pack lives at /api/export/vrp/[id]).
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
const phaseTitle = (k: string) => VR_PHASES.find((p) => p.key === k)?.title ?? k;

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
  const openRisks = [...track.risks].filter((r) => r.status === "OPEN")
    .sort((a, b) => (b.likelihood ?? 0) * (b.impact ?? 0) - (a.likelihood ?? 0) * (a.impact ?? 0));
  const qbr = track.reports[0]?.content as { executiveStory?: string; nextBestActions?: string[] | string; expansion?: string } | undefined;
  const nextActions: string[] = Array.isArray(qbr?.nextBestActions) ? qbr!.nextBestActions as string[] : (qbr?.nextBestActions ? [qbr.nextBestActions as string] : []);

  const h = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const p = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 80 } });
  const bullet = (t: string) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 30 } });
  const gcell = (t: string, w: number, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string; color?: string } = {}) =>
    new TableCell({ width: { size: w, type: WidthType.DXA }, shading: opts.fill ? { fill: opts.fill } : undefined,
      children: [new Paragraph({ alignment: opts.align, spacing: { before: 20, after: 20 }, children: [new TextRun({ text: t, bold: opts.bold, color: opts.color, size: 18 })] })] });
  const gtable = (widths: number[], rows: TableRow[]) =>
    new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows });
  const BLUE = "0053B4", WHITE = "FFFFFF";

  const KW = [3000, 1400, 1400, 1900, 1300];
  const kpiRows = [
    new TableRow({ tableHeader: true, children: ["KPI", "Baseline", "Target", "Latest", "Source"].map((t, i) => gcell(t, KW[i], { bold: true, fill: BLUE, color: WHITE })) }),
    ...track.kpiTargets.map((k) => {
      const latest = k.actuals[k.actuals.length - 1];
      const vals = [k.definition.name, k.baselineValue != null ? `${k.baselineValue} ${k.unit}` : "—", k.targetValue != null ? `${k.targetValue} ${k.unit}` : "—", latest ? `${latest.value} ${k.unit}` : "—", k.dataSource ?? "—"];
      return new TableRow({ children: vals.map((v, i) => gcell(v, KW[i])) });
    }),
  ];
  const WW = [3600, 2800, 1500, 1500];
  const wpRows = [
    new TableRow({ tableHeader: true, children: ["Work package", "From recommendation", "Due", "Status"].map((t, i) => gcell(t, WW[i], { bold: true, fill: BLUE, color: WHITE })) }),
    ...track.workPackages.map((w) => new TableRow({ children: [w.name, w.recommendation?.title ?? "—", fmtDate(w.dueDate), w.status.replace(/_/g, " ").toLowerCase()].map((v, i) => gcell(v, WW[i])) })),
  ];

  const doc = brandedDoc({
    docTitle: "Value Realisation — Track Status Report",
    code: track.code,
    subtitle: track.title,
    metaLine: `Blue Turtle Technologies · Value Realisation   |   ${track.code}${track.study ? ` · from ${track.study.code}` : " · standalone"}   |   Owner: ${track.owner.name}   |   Generated: ${fmtDate(new Date())}`,
    body: [
      h("Status at a glance"),
      p(`Health: ${track.health}.  Status: ${track.status.replace(/_/g, " ").toLowerCase()}.  Value realised: ${fmtMoney(realized, cur)} of ${fmtMoney(planned, cur)} planned (${fmtPct(valuePct)}).  Phase progress: ${done} of ${phases.length} complete${current ? ` (current: ${phaseTitle(current.phase)})` : ""}.  Open risks: ${openRisks.length}.  Target date: ${fmtDate(track.targetDate)}.`),
      ...(track.objectives ? [p(`Objectives: ${track.objectives}`)] : []),

      h("Phase progress"),
      ...phases.map((ph) => bullet(`${ph.order}. ${phaseTitle(ph.phase)} — ${ph.status.replace(/_/g, " ").toLowerCase()}${ph.id === current?.id ? "  (current)" : ""}`)),

      h("KPIs — baseline → target → latest"),
      ...(track.kpiTargets.length ? [gtable(KW, kpiRows)] : [p("No KPIs recorded.")]),

      h("Work packages"),
      ...(track.workPackages.length ? [gtable(WW, wpRows)] : [p("No work packages.")]),

      h("Benefits realisation"),
      ...(track.benefits.length
        ? track.benefits.map((b) => bullet(`${b.label}: ${fmtMoney(b.realizedValue, b.currency)} realised of ${fmtMoney(b.plannedValue, b.currency)} planned (${fmtPct(b.plannedValue > 0 ? (b.realizedValue / b.plannedValue) * 100 : 0)})`))
        : [p("No benefits recorded.")]),

      h("Open risks"),
      ...(openRisks.length
        ? openRisks.map((r) => bullet(`[${(r.likelihood ?? 0) * (r.impact ?? 0) || "—"}] ${r.title}${r.mitigation ? " — " + r.mitigation : ""}`))
        : [p("No open risks.")]),

      h("Latest QBR / EBR — executive value story"),
      p(qbr?.executiveStory ?? "—"),
      ...nextActions.map((a) => bullet(`Next best action: ${a}`)),
      ...(qbr?.expansion ? [bullet(`Expansion opportunity: ${qbr.expansion}`)] : []),
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${track.code}-status-report.docx"`,
    },
  });
}
