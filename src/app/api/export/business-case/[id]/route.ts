import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from "docx";
import { prisma } from "@/lib/db";
import { computeFinance, fmtMoney, fmtPct, type CashFlowLine } from "@/lib/finance";

// VE deliverable export: Business case as a Word document.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      industry: true,
      owner: true,
      recommendations: true,
      businessCase: { include: { scenarios: { orderBy: { order: "asc" } }, costItems: true } },
      handover: { orderBy: { order: "asc" } },
      risks: true,
    },
  });
  if (!study) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bc = study.businessCase;
  const cur = bc?.currency ?? study.currency;

  const lines: CashFlowLine[] = (bc?.costItems ?? []).map((c) => ({ label: c.label, kind: c.kind as CashFlowLine["kind"], amount: c.amount, year: c.year, recurring: c.recurring }));
  const fin = computeFinance(lines, { discountRatePct: bc?.discountRatePct ?? 10, horizonYears: bc?.horizonYears ?? 5 });

  const h = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const p = (text: string) => new Paragraph({ children: [new TextRun(text)], spacing: { after: 80 } });
  const bullet = (text: string) => new Paragraph({ text, bullet: { level: 0 } });

  const cell = (text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
    new TableCell({
      width: { size: 25, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold })] })],
    });

  const finTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell("Metric", { bold: true }), cell("Value", { bold: true, align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Total investment"), cell(fmtMoney(fin.totalInvestment, cur), { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Annual net benefit"), cell(fmtMoney(fin.annualNetBenefit, cur), { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("ROI"), cell(fmtPct(fin.roiPct), { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("Payback"), cell(fin.paybackMonths != null ? `${fin.paybackMonths.toFixed(1)} months` : "—", { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell(`NPV @ ${bc?.discountRatePct ?? 10}%`), cell(fmtMoney(fin.npv, cur), { align: AlignmentType.RIGHT })] }),
      new TableRow({ children: [cell("IRR"), cell(fmtPct(fin.irrPct), { align: AlignmentType.RIGHT })] }),
    ],
  });

  const costRows = [
    new TableRow({ children: [cell("Line item", { bold: true }), cell("Type", { bold: true }), cell("Year", { bold: true }), cell("Amount", { bold: true, align: AlignmentType.RIGHT })] }),
    ...(bc?.costItems ?? []).map((c) =>
      new TableRow({ children: [cell(c.label), cell(c.kind.toLowerCase() + (c.recurring ? " (recurring)" : "")), cell(String(c.year ?? "—")), cell(`${c.kind === "BENEFIT" ? "+" : "−"}${fmtMoney(c.amount, cur)}`, { align: AlignmentType.RIGHT })] })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Value Engineering — Business Case", heading: HeadingLevel.TITLE }),
          new Paragraph({ children: [new TextRun({ text: `${study.code} · ${study.title}`, bold: true })] }),
          p(`Solution: ${study.industry.name}  |  Owner: ${study.owner.name}  |  Status: ${study.status}`),

          h("Executive summary"),
          p(bc?.executiveSummary ?? "—"),

          h("Problem statement & scope"),
          p(study.problemStatement ?? "—"),
          p(study.scope ?? ""),

          h("Recommendations"),
          ...study.recommendations.map((r) => bullet(`${r.title} — ${r.status.toLowerCase()} · value ${fmtMoney(r.estimatedValue, cur)}`)),

          h("Scenarios"),
          ...(bc?.scenarios ?? []).map((s) => bullet(`${s.isBaseline ? "Baseline" : "Proposed"}: ${s.name}${s.description ? " — " + s.description : ""}`)),

          h("Cost / benefit"),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: costRows }),

          h("Financials"),
          finTable,

          ...(bc?.lccaNotes ? [h("Life-cycle cost analysis"), p(bc.lccaNotes)] : []),

          h("Risks & mitigations"),
          ...(study.risks.length ? study.risks.map((r) => bullet(`${r.title}${r.mitigation ? " — Mitigation: " + r.mitigation : ""} (L${r.likelihood ?? "?"}/I${r.impact ?? "?"})`)) : [p("—")]),

          h("Value handover — baselines, KPIs & success criteria"),
          ...(study.handover.length ? study.handover.map((a) => bullet(`[${a.type.replaceAll("_", " ")}] ${a.title}${a.detail ? " — " + a.detail : ""}`)) : [p("—")]),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${study.code}-business-case.docx"`,
    },
  });
}
