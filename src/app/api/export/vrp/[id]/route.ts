import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from "docx";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtPct } from "@/lib/finance";

// VR deliverable export: Value Realization Plan + QBR pack as a Word document.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await prisma.realizationTrack.findUnique({
    where: { id },
    include: {
      industry: true, owner: true, study: true,
      workPackages: { orderBy: { order: "asc" }, include: { recommendation: true } },
      adoptionPlan: { include: { activities: true } },
      benefits: true,
      kpiTargets: { include: { definition: true, actuals: { orderBy: { periodDate: "asc" } } } },
      reports: { orderBy: { createdAt: "desc" } },
      risks: true,
    },
  });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cur = track.currency;

  const h = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const p = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 80 } });
  const bullet = (t: string) => new Paragraph({ text: t, bullet: { level: 0 } });
  const cell = (t: string, bold = false, align?: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
    new TableCell({ children: [new Paragraph({ alignment: align, children: [new TextRun({ text: t, bold })] })] });

  const planned = track.plannedValue ?? 0;
  const realized = track.realizedValue ?? 0;
  const variance = planned > 0 ? ((realized - planned) / planned) * 100 : 0;

  const kpiRows = [
    new TableRow({ children: [cell("KPI", true), cell("Baseline", true), cell("Target", true), cell("Latest", true), cell("Source", true)] }),
    ...track.kpiTargets.map((k) => {
      const latest = k.actuals[k.actuals.length - 1];
      return new TableRow({ children: [cell(k.definition.name), cell(String(k.baselineValue ?? "—")), cell(String(k.targetValue ?? "—")), cell(latest ? `${latest.value} ${k.unit}` : "—"), cell(k.dataSource ?? "—")] });
    }),
  ];

  const wpRows = [
    new TableRow({ children: [cell("Work package", true), cell("From recommendation", true), cell("Due", true), cell("Status", true)] }),
    ...track.workPackages.map((w) => new TableRow({ children: [cell(w.name), cell(w.recommendation?.title ?? "—"), cell(w.dueDate ? new Date(w.dueDate).toLocaleDateString() : "—"), cell(w.status.toLowerCase())] })),
  ];

  const qbr = track.reports[0]?.content as { executiveStory?: string; nextBestActions?: string[] | string; expansion?: string } | undefined;
  const nextBestActions: string[] = Array.isArray(qbr?.nextBestActions)
    ? qbr!.nextBestActions
    : qbr?.nextBestActions
      ? String(qbr.nextBestActions).split(/\s*;\s*/).filter(Boolean)
      : [];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Value Realization Plan & QBR Pack", heading: HeadingLevel.TITLE }),
          new Paragraph({ children: [new TextRun({ text: `${track.code} · ${track.title}`, bold: true })] }),
          p(`${track.study ? `Source study: ${track.study.code}` : "Standalone (existing software)"} · Solution: ${track.industry.name} · Owner: ${track.owner.name} · Health: ${track.health}`),

          h("Objectives & success criteria"),
          p(track.objectives ?? "—"),
          p(track.successCriteria ? `Success criteria: ${track.successCriteria}` : ""),

          h("Value summary"),
          bullet(`Planned value: ${fmtMoney(planned, cur)}`),
          bullet(`Realized value: ${fmtMoney(realized, cur)} (${fmtPct((realized / (planned || 1)) * 100)} of plan)`),
          bullet(`Variance vs plan: ${fmtPct(variance)}`),

          h("Baseline & KPI measurement plan"),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: kpiRows }),

          h("Implementation work breakdown"),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: wpRows }),

          h("Benefits realization"),
          ...track.benefits.map((b) => bullet(`${b.label}: ${fmtMoney(b.realizedValue, cur)} realized of ${fmtMoney(b.plannedValue, cur)} planned`)),

          h("Adoption & change management"),
          p(track.adoptionPlan?.changeImpact ?? "—"),
          ...(track.adoptionPlan?.activities ?? []).map((a) => bullet(`${a.label} (${a.audience ?? "all"}) — ${a.status.toLowerCase()}`)),

          h("Risks & mitigations"),
          ...(track.risks.length ? track.risks.map((r) => bullet(`${r.title}${r.mitigation ? " — " + r.mitigation : ""}`)) : [p("—")]),

          h("QBR / EBR — executive value story"),
          p(qbr?.executiveStory ?? "—"),
          ...nextBestActions.map((a) => bullet(`Next best action: ${a}`)),
          ...(qbr?.expansion ? [bullet(`Expansion opportunity: ${qbr.expansion}`)] : []),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${track.code}-value-realization-plan.docx"`,
    },
  });
}
