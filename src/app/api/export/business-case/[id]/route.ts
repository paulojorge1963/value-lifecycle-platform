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

  // Fixed DXA column widths so tables render with real proportions (not squished).
  const R = AlignmentType.RIGHT;
  const FW = [3000, 6000];
  const CWID = [4000, 2200, 1000, 1800];
  const gcell = (text: string, w: number, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
    new TableCell({ width: { size: w, type: WidthType.DXA }, children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold })] })] });
  const gtable = (widths: number[], rows: TableRow[]) =>
    new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows });
  const finRow = (label: string, value: string) => new TableRow({ children: [gcell(label, FW[0]), gcell(value, FW[1], { align: R })] });

  const finTable = gtable(FW, [
    new TableRow({ children: [gcell("Metric", FW[0], { bold: true }), gcell("Value", FW[1], { bold: true, align: R })] }),
    finRow("Total investment", fmtMoney(fin.totalInvestment, cur)),
    finRow("Annual net benefit", fmtMoney(fin.annualNetBenefit, cur)),
    finRow("ROI", fmtPct(fin.roiPct)),
    finRow("Payback", fin.paybackMonths != null ? `${fin.paybackMonths.toFixed(1)} months` : "—"),
    finRow(`NPV @ ${bc?.discountRatePct ?? 10}%`, fmtMoney(fin.npv, cur)),
    finRow("IRR", fmtPct(fin.irrPct)),
  ]);

  const costRows = [
    new TableRow({ children: ["Line item", "Type", "Year", "Amount"].map((t, i) => gcell(t, CWID[i], { bold: true, align: i === 3 ? R : undefined })) }),
    ...(bc?.costItems ?? []).map((c) => {
      const vals = [c.label, c.kind.toLowerCase() + (c.recurring ? " (recurring)" : ""), String(c.year ?? "—"), `${c.kind === "BENEFIT" ? "+" : "−"}${fmtMoney(c.amount, cur)}`];
      return new TableRow({ children: vals.map((v, i) => gcell(v, CWID[i], i === 3 ? { align: R } : {})) });
    }),
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
          gtable(CWID, costRows),

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
