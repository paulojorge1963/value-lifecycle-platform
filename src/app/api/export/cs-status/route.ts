import { NextResponse } from "next/server";
import { Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from "docx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney } from "@/lib/finance";
import { brandedDoc } from "@/lib/export/doc-template";
import { CS_STAGES } from "@/lib/domain/cs-stages";

// Portfolio Health Report across all Customer Success engagements (Word .docx).
const STAGE_TITLE: Record<string, string> = Object.fromEntries(CS_STAGES.map((s) => [s.key, s.title]));
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active", AT_RISK: "At risk", RENEWED: "Renewed", CHURNED: "Churned", ARCHIVED: "Archived",
};

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const engagements = await prisma.customerSuccessEngagement.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, owner: true, stages: true, actions: true },
    orderBy: [{ healthOverall: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  // Roll-ups
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
  const W = [2500, 950, 1150, 1800, 1500, 1450, 900]; // Engagement | Health | Status | Stage | ARR | Renewal | Actions
  const headRow = new TableRow({
    tableHeader: true,
    children: ["Engagement", "Health", "Status", "Stage", "ARR", "Renewal", "Open actions"].map((t, i) =>
      gcell(t, W[i], { bold: true, fill: BLUE, color: WHITE })),
  });
  const rows = engagements.map((e) => {
    const openActions = e.actions.filter((a) => a.status !== "DONE").length;
    return new TableRow({ children: [
      gcell(`${e.code} — ${e.accountName}`, W[0]),
      gcell(e.healthOverall, W[1], { align: AlignmentType.CENTER, bold: true }),
      gcell(STATUS_LABEL[e.status] ?? e.status, W[2]),
      gcell(currentStage(e), W[3]),
      gcell(fmtMoney(e.arr, e.currency), W[4]),
      gcell(fmtDate(e.renewalDate), W[5]),
      gcell(String(openActions), W[6], { align: AlignmentType.CENTER }),
    ] });
  });

  const arrLines = currencies.map(([cur, v]) =>
    bullet(`${cur}: ${fmtMoney(v.total, cur)} ARR across ${v.count} account${v.count === 1 ? "" : "s"}.`));
  const attention = engagements
    .filter((e) => e.healthOverall !== "GREEN" || (e.renewalDate && (new Date(e.renewalDate).getTime() - now) / DAY <= 90 && (new Date(e.renewalDate).getTime() - now) / DAY >= 0))
    .map((e) => {
      const renew = e.renewalDate ? ` — renewal ${fmtDate(e.renewalDate)}` : "";
      return bullet(`${e.healthOverall} · ${e.code} ${e.accountName} (${STATUS_LABEL[e.status] ?? e.status})${renew}`);
    });

  const doc = brandedDoc({
    docTitle: "Customer Success — Status Report",
    code: orgName || "Portfolio",
    subtitle: "Health and renewal status across all engagements",
    metaLine: `Blue Turtle Technologies · Customer Success   |   ${orgName}   |   Generated: ${fmtDate(new Date())}`,
    body: [
      h("Portfolio summary"),
      p(`The portfolio holds ${engagements.length} Customer Success engagement${engagements.length === 1 ? "" : "s"} — ${atRisk} at risk (amber or red), ${renewalsDue} renewal${renewalsDue === 1 ? "" : "s"} due within 90 days. Health: ${health.GREEN ?? 0} green, ${health.AMBER ?? 0} amber, ${health.RED ?? 0} red.`),
      ...(arrLines.length ? arrLines : [p("No ARR figures recorded yet.")]),

      h("Attention needed"),
      ...(attention.length ? attention : [p("No engagements are amber, red, or up for renewal in the next 90 days.")]),

      h("Engagements"),
      gtable(W, [headRow, ...rows]),

      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "Health is set per engagement; renewal and ARR come from the engagement record. Open an engagement for its success plan, health history and renewal plan.", italics: true, size: 16, color: "5E7789" })] }),
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="CS-Status-Report-${stamp}.docx"`,
    },
  });
}
