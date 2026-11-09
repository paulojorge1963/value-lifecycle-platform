import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney, fmtPct } from "@/lib/finance";
import { buildVePortfolioDeck, type VeStudyRow } from "@/lib/export/ve-status-deck";
import { VE_PHASES } from "@/lib/domain/phases";

const PHASE_TITLE: Record<string, string> = Object.fromEntries(VE_PHASES.map((p) => [p.key, p.title]));
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", ACTIVE: "Active", IN_REVIEW: "In review", APPROVED: "Approved",
  REJECTED: "Rejected", HANDED_OVER: "Handed over", ARCHIVED: "Archived",
};
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
    include: { owner: true, businessCase: true, phases: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

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
  const currencies = [...byCur.entries()];
  const single = currencies.length === 1 ? currencies[0] : null;

  const rows: VeStudyRow[] = studies.map((s) => ({
    code: s.code, title: s.title, customer: s.customerName ?? "",
    status: STATUS_LABEL[s.status] ?? s.status, phase: studyPhase(s),
    value: fmtMoney(s.estimatedValue, s.currency),
    roi: s.businessCase?.roiPct != null ? fmtPct(s.businessCase.roiPct) : "—",
    payback: payback(s.businessCase?.paybackMonths), owner: s.owner.name,
  }));
  const attention = studies.filter((s) => s.status === "IN_REVIEW").map((s) =>
    `${s.code} ${s.title}${s.customerName ? ` (${s.customerName})` : ""} — ${fmtMoney(s.estimatedValue, s.currency)}${s.businessCase?.roiPct != null ? `, ROI ${fmtPct(s.businessCase.roiPct)}` : ""}`);

  const buf = await buildVePortfolioDeck({
    orgName, generated: new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    totalStudies: studies.length, approved: byStatus.APPROVED ?? 0, atGate: byStatus.IN_REVIEW ?? 0, active: byStatus.ACTIVE ?? 0,
    valueHeadline: single ? fmtMoney(single[1].total, single[0]) : currencies.length ? "mixed" : "—",
    valueSub: single ? `${single[1].count} stud${single[1].count === 1 ? "y" : "ies"}` : `${currencies.length} currencies`,
    currencies: currencies.map(([cur, v]) => ({ currency: cur, total: fmtMoney(v.total, cur), count: v.count })),
    studies: rows, attention,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="VE-Status-Report-${stamp}.pptx"`,
    },
  });
}
