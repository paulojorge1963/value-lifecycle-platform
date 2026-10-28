import { NextResponse } from "next/server";
import { Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType } from "docx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { brandedDoc } from "@/lib/export/doc-template";
import { VR_PHASES } from "@/lib/domain/phases";

// Portfolio Status Report across all Value Realisation tracks (Word .docx).
const PHASE_TITLE: Record<string, string> = Object.fromEntries(VR_PHASES.map((p) => [p.key, p.title]));

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}
function milestone(t: { status: string; phases: { phase: string; order: number; status: string }[] }) {
  if (t.status === "REALIZED" || t.status === "CLOSED") return "Realised";
  const sorted = [...t.phases].sort((a, b) => a.order - b.order);
  const cur = sorted.find((p) => p.status === "IN_PROGRESS") ?? sorted.find((p) => p.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? (PHASE_TITLE[cur.phase] ?? cur.phase) : "—";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracks = await prisma.realizationTrack.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, owner: true, study: { select: { code: true } }, phases: true, risks: true },
    orderBy: [{ health: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  // Roll-ups
  const health: Record<string, number> = { GREEN: 0, AMBER: 0, RED: 0 };
  const byStatus: Record<string, number> = {};
  const byCur = new Map<string, { planned: number; realized: number; count: number }>();
  for (const t of tracks) {
    health[t.health] = (health[t.health] ?? 0) + 1;
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    const e = byCur.get(t.currency) ?? { planned: 0, realized: 0, count: 0 };
    e.planned += t.plannedValue ?? 0; e.realized += t.realizedValue ?? 0; e.count += 1;
    byCur.set(t.currency, e);
  }
  const atRisk = (health.AMBER ?? 0) + (health.RED ?? 0);
  const inFlight = byStatus.IN_FLIGHT ?? 0;

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
  const W = [2500, 800, 1000, 1950, 650, 1300, 600]; // Track | Health | Status | Realised/Planned | % | Milestone | Risks
  const headRow = new TableRow({
    tableHeader: true,
    children: ["Track", "Health", "Status", "Realised / Planned", "%", "Next milestone", "Risks"].map((t, i) =>
      gcell(t, W[i], { bold: true, fill: BLUE, color: WHITE, align: i >= 4 && i <= 4 ? AlignmentType.CENTER : undefined })),
  });
  const rows = tracks.map((t) => {
    const pct = t.plannedValue && t.plannedValue > 0 ? ((t.realizedValue ?? 0) / t.plannedValue) * 100 : 0;
    const openRisks = t.risks.filter((r) => r.status === "OPEN").length;
    const origin = t.study ? `from ${t.study.code}` : "standalone";
    return new TableRow({ children: [
      gcell(`${t.code} — ${t.title}  (${origin})`, W[0]),
      gcell(t.health, W[1]),
      gcell(t.status.replace(/_/g, " ").toLowerCase(), W[2]),
      gcell(`${fmtMoney(t.realizedValue, t.currency)} / ${fmtMoney(t.plannedValue, t.currency)}`, W[3]),
      gcell(fmtPct(pct), W[4], { align: AlignmentType.CENTER }),
      gcell(milestone(t), W[5]),
      gcell(String(openRisks), W[6], { align: AlignmentType.CENTER }),
    ] });
  });

  // "Attention needed" — amber/red tracks with their top open risk.
  const attention = tracks.filter((t) => t.health === "RED" || t.health === "AMBER").map((t) => {
    const topRisk = [...t.risks].filter((r) => r.status === "OPEN")
      .sort((a, b) => (b.likelihood ?? 0) * (b.impact ?? 0) - (a.likelihood ?? 0) * (a.impact ?? 0))[0];
    const tail = topRisk ? ` — top risk: ${topRisk.title}` : ` — ${milestone(t)}`;
    return bullet(`${t.health} · ${t.code} ${t.title}${tail}`);
  });

  const valueLines = [...byCur.entries()].map(([cur, v]) => {
    const pct = v.planned > 0 ? (v.realized / v.planned) * 100 : 0;
    return bullet(`${cur}: ${fmtMoney(v.realized, cur)} realised of ${fmtMoney(v.planned, cur)} planned (${fmtPct(pct)}) across ${v.count} track${v.count === 1 ? "" : "s"}.`);
  });

  const doc = brandedDoc({
    docTitle: "Value Realisation — Status Report",
    code: orgName || "Portfolio",
    subtitle: "Portfolio status across all Value Realisation tracks",
    metaLine: `Blue Turtle Technologies · Value Realisation   |   ${orgName}   |   Generated: ${fmtDate(new Date())}`,
    body: [
      h("Portfolio summary"),
      p(`The portfolio holds ${tracks.length} Value Realisation track${tracks.length === 1 ? "" : "s"} — ${inFlight} in flight, ${atRisk} at risk (amber or red). Health: ${health.GREEN ?? 0} green, ${health.AMBER ?? 0} amber, ${health.RED ?? 0} red.`),
      ...(valueLines.length ? valueLines : [p("No value figures recorded yet.")]),

      h("Attention needed"),
      ...(attention.length ? attention : [p("No tracks are currently amber or red.")]),

      h("Tracks"),
      gtable(W, [headRow, ...rows]),

      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "Realised value rolls up from benefit actuals; health and status are set per track. For a track's full plan, KPIs and QBR story, export its VRP / QBR pack.", italics: true, size: 16, color: "5E7789" })] }),
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="VR-Status-Report-${stamp}.docx"`,
    },
  });
}
