import { NextResponse } from "next/server";
import { Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from "docx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { brandedDoc } from "@/lib/export/doc-template";
import { VE_PHASES } from "@/lib/domain/phases";

// Portfolio Status Report across all Value Engineering studies (Word .docx).
const PHASE_TITLE: Record<string, string> = Object.fromEntries(VE_PHASES.map((p) => [p.key, p.title]));
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", ACTIVE: "Active", IN_REVIEW: "In review", APPROVED: "Approved",
  REJECTED: "Rejected", HANDED_OVER: "Handed over", ARCHIVED: "Archived",
};

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
function studyPhase(st: { status: string; phases: { phase: string; order: number; status: string }[] }) {
  if (st.status === "APPROVED") return "Approved";
  if (st.status === "HANDED_OVER") return "Handed over";
  if (st.status === "REJECTED") return "Rejected";
  const sorted = [...st.phases].sort((a, b) => a.order - b.order);
  const cur = sorted.find((p) => p.status === "IN_PROGRESS") ?? sorted.find((p) => p.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? (PHASE_TITLE[cur.phase] ?? cur.phase) : "—";
}
const payback = (m: number | null | undefined) => (m != null ? `${m.toFixed(1)} mo` : "—");

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studies = await prisma.study.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, owner: true, businessCase: true, phases: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  // Roll-ups
  const byStatus: Record<string, number> = {};
  const byCur = new Map<string, { total: number; count: number }>();
  for (const s of studies) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    if (s.estimatedValue && s.estimatedValue > 0) {
      const e = byCur.get(s.currency) ?? { total: 0, count: 0 };
      e.total += s.estimatedValue; e.count += 1;
      byCur.set(s.currency, e);
    }
  }
  const approved = byStatus.APPROVED ?? 0;
  const atGate = byStatus.IN_REVIEW ?? 0;
  const active = byStatus.ACTIVE ?? 0;
  const currencies = [...byCur.entries()];

  // docx helpers
  const h = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const p = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 80 } });
  const bullet = (t: string) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 30 } });
  const gcell = (t: string, w: number, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string; color?: string } = {}) =>
    new TableCell({ width: { size: w, type: WidthType.DXA }, shading: opts.fill ? { fill: opts.fill } : undefined,
      children: [new Paragraph({ alignment: opts.align, spacing: { before: 20, after: 20 }, children: [new TextRun({ text: t, bold: opts.bold, color: opts.color, size: 18 })] })] });
  const gtable = (widths: number[], rows: TableRow[]) =>
    new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows });

  const BLUE = "0053B4", WHITE = "FFFFFF";
  const W = [2600, 1200, 1900, 1550, 700, 900, 1950]; // Study | Status | Phase | Value | ROI | Payback | Owner
  const headRow = new TableRow({
    tableHeader: true,
    children: ["Study", "Status", "Phase", "Value", "ROI", "Payback", "Owner"].map((t, i) =>
      gcell(t, W[i], { bold: true, fill: BLUE, color: WHITE })),
  });
  const rows = studies.map((s) => new TableRow({ children: [
    gcell(`${s.code} — ${s.title}${s.customerName ? `  (${s.customerName})` : ""}`, W[0]),
    gcell(STATUS_LABEL[s.status] ?? s.status, W[1]),
    gcell(studyPhase(s), W[2]),
    gcell(fmtMoney(s.estimatedValue, s.currency), W[3]),
    gcell(s.businessCase?.roiPct != null ? fmtPct(s.businessCase.roiPct) : "—", W[4], { align: AlignmentType.CENTER }),
    gcell(payback(s.businessCase?.paybackMonths), W[5], { align: AlignmentType.CENTER }),
    gcell(s.owner.name, W[6]),
  ] }));

  const valueLines = currencies.map(([cur, v]) =>
    bullet(`${cur}: ${fmtMoney(v.total, cur)} identified across ${v.count} stud${v.count === 1 ? "y" : "ies"}.`));
  const atGateStudies = studies.filter((s) => s.status === "IN_REVIEW").map((s) =>
    bullet(`${s.code} ${s.title}${s.customerName ? ` (${s.customerName})` : ""} — ${fmtMoney(s.estimatedValue, s.currency)}${s.businessCase?.roiPct != null ? `, ROI ${fmtPct(s.businessCase.roiPct)}` : ""}`));

  const doc = brandedDoc({
    docTitle: "Value Engineering — Status Report",
    code: orgName || "Pipeline",
    subtitle: "Pipeline status across all Value Engineering studies",
    metaLine: `Blue Turtle Technologies · Value Engineering   |   ${orgName}   |   Generated: ${fmtDate(new Date())}`,
    body: [
      h("Pipeline summary"),
      p(`The pipeline holds ${studies.length} Value Engineering stud${studies.length === 1 ? "y" : "ies"} — ${active} active, ${atGate} at the decision gate (in review), ${approved} approved.`),
      ...(valueLines.length ? valueLines : [p("No value figures recorded yet.")]),

      h("At the decision gate"),
      ...(atGateStudies.length ? atGateStudies : [p("No studies are currently in review.")]),

      h("Studies"),
      gtable(W, [headRow, ...rows]),

      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "Value is the study's estimated impact; ROI and payback come from the business case. Open a study for its full Job Plan, alternatives and business case.", italics: true, size: 16, color: "5E7789" })] }),
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="VE-Status-Report-${stamp}.docx"`,
    },
  });
}
