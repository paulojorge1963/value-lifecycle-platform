import { NextResponse } from "next/server";
import { Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct, DEFAULT_CURRENCY } from "@/lib/finance";
import { brandedDoc } from "@/lib/export/doc-template";
import { gatherLifecycle } from "@/lib/export/lifecycle-data";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const d = await gatherLifecycle(user.organizationId);
  const cur = d.reportCurrency || DEFAULT_CURRENCY;

  const h = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
  const p = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 80 } });
  const bullet = (t: string) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 30 } });

  const realisedPct = d.vr.plannedInTracks > 0 ? (d.vr.realized / d.vr.plannedInTracks) * 100 : null;
  const narrative = `Of ${fmtMoney(d.ve.planned, cur)} in value promised across ${d.ve.total} Value Engineering stud${d.ve.total === 1 ? "y" : "ies"}, ${fmtMoney(d.vr.realized, cur)} has been proven in realisation${realisedPct != null ? ` (${fmtPct(realisedPct)} of the plan in flight)` : ""}, and ${fmtMoney(d.cs.arr, cur)} of ARR is being sustained across ${d.cs.total} Customer Success engagement${d.cs.total === 1 ? "" : "s"}.`;

  const doc = brandedDoc({
    docTitle: "Value Lifecycle — Executive Status Report",
    code: d.orgName || "Value Lifecycle",
    subtitle: "The value thread — engineered, realised, sustained",
    metaLine: `Blue Turtle Technologies   |   ${d.orgName}   |   Generated: ${fmtDate(new Date())}`,
    body: [
      h("The value thread"),
      p(narrative),

      h("Value Engineering — promised"),
      bullet(`${d.ve.total} stud${d.ve.total === 1 ? "y" : "ies"} (${d.ve.active} active) — ${fmtMoney(d.ve.planned, cur)} in identified value.`),
      bullet(`${d.ve.approved} approved, ${d.ve.atGate} at the decision gate (in review).`),

      h("Value Realisation — proven"),
      bullet(`${d.vr.total} track${d.vr.total === 1 ? "" : "s"} (${d.vr.inFlight} in flight) — ${fmtMoney(d.vr.realized, cur)} realised of ${fmtMoney(d.vr.plannedInTracks, cur)} planned${realisedPct != null ? ` (${fmtPct(realisedPct)})` : ""}.`),
      bullet(`Health: ${d.vr.health.GREEN} green, ${d.vr.health.AMBER} amber, ${d.vr.health.RED} red (${d.vr.atRisk} at risk).`),

      h("Customer Success — sustained"),
      bullet(`${d.cs.total} engagement${d.cs.total === 1 ? "" : "s"} — ${fmtMoney(d.cs.arr, cur)} ARR under management.`),
      bullet(`Health: ${d.cs.health.GREEN} green, ${d.cs.health.AMBER} amber, ${d.cs.health.RED} red (${d.cs.atRisk} at risk); ${d.cs.renewalsDue} renewal${d.cs.renewalsDue === 1 ? "" : "s"} due within 90 days.`),

      h("Attention across the lifecycle"),
      ...(d.attention.length ? d.attention.map(bullet) : [p("Nothing flagged across the three pillars.")]),

      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: `Values roll up in ${cur}; mixed-currency workspaces are shown at prevailing study currency. Open each pillar's status report for the full breakdown.`, italics: true, size: 16, color: "5E7789" })] }),
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Value-Lifecycle-Status-Report-${stamp}.docx"`,
    },
  });
}
