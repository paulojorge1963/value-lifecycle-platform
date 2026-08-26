import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun } from "docx";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { CS_STAGE_TITLE } from "@/lib/domain/cs-stages";

// CS deliverable export: Account Success Review (health, value, renewal, growth).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.customerSuccessEngagement.findUnique({
    where: { id },
    include: {
      industry: true, owner: true, stages: true,
      stakeholders: { orderBy: { influence: "desc" } },
      actions: { orderBy: { createdAt: "desc" } },
      healthScores: { orderBy: { periodDate: "asc" } },
      renewalPlan: true, growthPlan: true,
      studies: { include: { businessCase: true } },
      tracks: true,
    },
  });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const cur = e.currency;

  const h = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const p = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 80 } });
  const bullet = (t: string) => new Paragraph({ text: t, bullet: { level: 0 } });
  // Fixed DXA column widths so tables render with real proportions (not squished).
  const SW = [3400, 2200, 1400, 2000];
  const gcell = (t: string, w: number, bold = false) => new TableCell({ width: { size: w, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: t, bold })] })] });
  const gtable = (widths: number[], rows: TableRow[]) => new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows });

  const planned = e.tracks.reduce((s, t) => s + (t.plannedValue ?? 0), 0);
  const realized = e.tracks.reduce((s, t) => s + (t.realizedValue ?? 0), 0);
  // Current stage = where the engagement is now (mirrors the CS detail page):
  // first IN_PROGRESS stage, else the first not-yet-complete stage, else stage 1.
  const stagesByOrder = [...e.stages].sort((a, b) => a.order - b.order);
  const currentStage =
    stagesByOrder.find((s) => s.status === "IN_PROGRESS") ??
    stagesByOrder.find((s) => s.status !== "COMPLETE") ??
    stagesByOrder[0];
  const currentStageNo = currentStage?.order ?? 1;
  const latestHealth = e.healthScores[e.healthScores.length - 1];
  const factors = (latestHealth?.factors as unknown as { label: string; score: number }[]) ?? [];
  const sp = (e.successPlan as { commitments?: string; successCriteria?: string; notes?: string } | null) ?? null;

  const stakeRows = [
    new TableRow({ children: ["Name", "Role", "Influence", "Sentiment"].map((t, i) => gcell(t, SW[i], true)) }),
    ...e.stakeholders.map((s) => {
      const vals = [[s.name, s.title].filter(Boolean).join(" — "), s.role ?? "—", s.influence ? `${s.influence}/5` : "—", s.sentiment.toLowerCase()];
      return new TableRow({ children: vals.map((v, i) => gcell(v, SW[i])) });
    }),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "Account Success Review", heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: `${e.code} · ${e.accountName}`, bold: true })] }),
        p(`Solution: ${e.industry.name} · CSM: ${e.owner.name} · Status: ${e.status} · Health: ${e.healthOverall} · Lifecycle stage ${currentStageNo}/8`),
        p(e.arr ? `ARR: ${fmtMoney(e.arr, cur)}${e.renewalDate ? ` · Renewal: ${new Date(e.renewalDate).toLocaleDateString()}` : ""}` : ""),

        h("Objectives & success plan"),
        p(e.objectives ?? "—"),
        ...(sp?.successCriteria ? [bullet(`Success criteria: ${sp.successCriteria}`)] : []),
        ...(sp?.commitments ? [bullet(`Commitments: ${sp.commitments}`)] : []),

        h("Value summary (from linked realization tracks)"),
        bullet(`Planned value: ${fmtMoney(planned, cur)}`),
        bullet(`Realized value: ${fmtMoney(realized, cur)} (${fmtPct((realized / (planned || 1)) * 100)} of plan)`),
        ...e.tracks.map((t) => bullet(`${t.code} · ${t.title}: ${fmtMoney(t.realizedValue ?? 0, t.currency)} / ${fmtMoney(t.plannedValue ?? 0, t.currency)}`)),
        ...e.studies.map((s) => bullet(`${s.code} · ${s.title}${s.businessCase?.roiPct != null ? ` — ROI ${fmtPct(s.businessCase.roiPct)}` : ""}`)),

        h("Customer health"),
        latestHealth ? p(`Overall ${latestHealth.overall}/100 (${latestHealth.periodLabel})`) : p("No health score recorded."),
        ...factors.map((f) => bullet(`${f.label}: ${f.score}/100`)),

        h("Stakeholder map"),
        ...(e.stakeholders.length ? [gtable(SW, stakeRows)] : [p("—")]),

        h("Action log"),
        ...(e.actions.length ? e.actions.map((a) => bullet(`[${a.status.toLowerCase()}] ${a.title}${a.owner ? ` — ${a.owner}` : ""}${a.dueDate ? ` (due ${new Date(a.dueDate).toLocaleDateString()})` : ""}`)) : [p("—")]),

        h("Renewal plan"),
        ...(e.renewalPlan ? [
          p(`Renewal date: ${e.renewalPlan.renewalDate ? new Date(e.renewalPlan.renewalDate).toLocaleDateString() : "—"}${e.renewalPlan.stage ? ` · ${e.renewalPlan.stage}` : ""}`),
          ...(e.renewalPlan.valueSummary ? [bullet(`Value: ${e.renewalPlan.valueSummary}`)] : []),
          ...(e.renewalPlan.risks ? [bullet(`Risks & gaps: ${e.renewalPlan.risks}`)] : []),
          ...(e.renewalPlan.procurementStatus ? [bullet(`Procurement: ${e.renewalPlan.procurementStatus}`)] : []),
          ...(e.renewalPlan.plannedActions ? [bullet(`Planned actions: ${e.renewalPlan.plannedActions}`)] : []),
        ] : [p("—")]),

        h("Expansion & growth plan"),
        ...(e.growthPlan ? [
          ...(e.growthPlan.triggers ? [bullet(`Triggers: ${e.growthPlan.triggers}`)] : []),
          ...(e.growthPlan.targetValue ? [bullet(`Target value: ${fmtMoney(e.growthPlan.targetValue, cur)}`)] : []),
          ...(e.growthPlan.narrative ? [p(e.growthPlan.narrative)] : []),
        ] : [p("—")]),

        h("Lifecycle status"),
        ...e.stages.sort((a, b) => a.order - b.order).map((s) => bullet(`${s.order}. ${CS_STAGE_TITLE[s.stage]} — ${s.status.toLowerCase()}`)),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${e.code}-account-success-review.docx"`,
    },
  });
}
