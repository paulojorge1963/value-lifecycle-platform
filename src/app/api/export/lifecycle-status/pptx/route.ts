import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct, DEFAULT_CURRENCY } from "@/lib/finance";
import { buildLifecycleDeck } from "@/lib/export/lifecycle-status-deck";
import { gatherLifecycle } from "@/lib/export/lifecycle-data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const d = await gatherLifecycle(user.organizationId);
  const cur = d.reportCurrency || DEFAULT_CURRENCY;
  const realisedPct = d.vr.plannedInTracks > 0 ? (d.vr.realized / d.vr.plannedInTracks) * 100 : null;

  const narrative = `Of ${fmtMoney(d.ve.planned, cur)} promised across ${d.ve.total} stud${d.ve.total === 1 ? "y" : "ies"}, ${fmtMoney(d.vr.realized, cur)} has been proven in realisation${realisedPct != null ? ` (${fmtPct(realisedPct)} of the plan in flight)` : ""}, and ${fmtMoney(d.cs.arr, cur)} of ARR is being sustained across ${d.cs.total} engagement${d.cs.total === 1 ? "" : "s"}.`;

  const buf = await buildLifecycleDeck({
    orgName: d.orgName,
    generated: new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    ve: {
      count: d.ve.total, countLabel: `stud${d.ve.total === 1 ? "y" : "ies"}`,
      valueHeadline: fmtMoney(d.ve.planned, cur), valueSub: "value promised",
      lines: [`${d.ve.active} active`, `${d.ve.approved} approved`, `${d.ve.atGate} at decision gate`],
    },
    vr: {
      count: d.vr.total, countLabel: `track${d.vr.total === 1 ? "" : "s"}`,
      valueHeadline: fmtMoney(d.vr.realized, cur),
      valueSub: `of ${fmtMoney(d.vr.plannedInTracks, cur)} planned${realisedPct != null ? ` (${fmtPct(realisedPct)})` : ""}`,
      lines: [`${d.vr.inFlight} in flight`, `${d.vr.health.GREEN} green · ${d.vr.health.AMBER} amber · ${d.vr.health.RED} red`, `${d.vr.atRisk} at risk`],
    },
    cs: {
      count: d.cs.total, countLabel: `engagement${d.cs.total === 1 ? "" : "s"}`,
      valueHeadline: fmtMoney(d.cs.arr, cur), valueSub: "ARR under management",
      lines: [`${d.cs.health.GREEN} green · ${d.cs.health.AMBER} amber · ${d.cs.health.RED} red`, `${d.cs.atRisk} at risk`, `${d.cs.renewalsDue} renewal${d.cs.renewalsDue === 1 ? "" : "s"} due ≤ 90 days`],
    },
    narrative,
    attention: d.attention,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Value-Lifecycle-Status-Report-${stamp}.pptx"`,
    },
  });
}
