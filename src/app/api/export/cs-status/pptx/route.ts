import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fmtMoney } from "@/lib/finance";
import { buildCsPortfolioDeck, type CsEngagementRow } from "@/lib/export/cs-status-deck";
import { CS_STAGES } from "@/lib/domain/cs-stages";

const STAGE_TITLE: Record<string, string> = Object.fromEntries(CS_STAGES.map((s) => [s.key, s.title]));
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active", AT_RISK: "At risk", RENEWED: "Renewed", CHURNED: "Churned", ARCHIVED: "Archived",
};
function currentStage(e: { stages: { stage: string; order: number; status: string }[] }) {
  const sorted = [...e.stages].sort((a, b) => a.order - b.order);
  const cur = sorted.find((s) => s.status === "IN_PROGRESS") ?? sorted.find((s) => s.status !== "COMPLETE") ?? sorted[sorted.length - 1];
  return cur ? (STAGE_TITLE[cur.stage] ?? cur.stage) : "—";
}
function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
const DAY = 86400000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const engagements = await prisma.customerSuccessEngagement.findMany({
    where: { organizationId: user.organizationId },
    include: { owner: true, stages: true, actions: true },
    orderBy: [{ healthOverall: "asc" }, { createdAt: "desc" }],
  });
  const orgName = (await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }))?.name ?? "";

  const health = { GREEN: 0, AMBER: 0, RED: 0 };
  const byCur = new Map<string, { total: number; count: number }>();
  let renewalsDue = 0;
  const now = Date.now();
  for (const e of engagements) {
    health[e.healthOverall as "GREEN" | "AMBER" | "RED"] += 1;
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
  const atRisk = health.AMBER + health.RED;
  const currencies = [...byCur.entries()];
  const single = currencies.length === 1 ? currencies[0] : null;

  const rows: CsEngagementRow[] = engagements.map((e) => ({
    code: e.code, account: e.accountName, health: e.healthOverall,
    status: STATUS_LABEL[e.status] ?? e.status, stage: currentStage(e),
    arr: fmtMoney(e.arr, e.currency), renewal: fmtDate(e.renewalDate),
    openActions: e.actions.filter((a) => a.status !== "DONE").length,
  }));
  const attention = engagements
    .filter((e) => e.healthOverall !== "GREEN" || (e.renewalDate && (new Date(e.renewalDate).getTime() - now) / DAY <= 90 && (new Date(e.renewalDate).getTime() - now) / DAY >= 0))
    .map((e) => `${e.healthOverall} · ${e.code} ${e.accountName} (${STATUS_LABEL[e.status] ?? e.status})${e.renewalDate ? ` — renewal ${fmtDate(e.renewalDate)}` : ""}`);

  const buf = await buildCsPortfolioDeck({
    orgName, generated: new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    totalEngagements: engagements.length, health, atRisk, renewalsDue,
    arrHeadline: single ? fmtMoney(single[1].total, single[0]) : currencies.length ? "mixed" : "—",
    arrSub: single ? `${single[1].count} account${single[1].count === 1 ? "" : "s"}` : `${currencies.length} currencies`,
    currencies: currencies.map(([cur, v]) => ({ currency: cur, total: fmtMoney(v.total, cur), count: v.count })),
    engagements: rows, attention,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="CS-Status-Report-${stamp}.pptx"`,
    },
  });
}
