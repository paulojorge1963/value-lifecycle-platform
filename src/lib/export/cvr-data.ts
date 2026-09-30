// =============================================================================
//  Assemble CvrData from a VE study. Shared by the export route and tests so the
//  Prisma → slide mapping lives in one place.
// =============================================================================
import { Prisma } from "@prisma/client";
import { computeFinance, fmtMoney, fmtPct, type CashFlowLine } from "@/lib/finance";
import type { CvrData } from "./cvr";

export const cvrInclude = {
  industry: true,
  owner: true,
  infoItems: true,
  functions: { orderBy: { order: "asc" } },
  recommendations: { orderBy: { order: "asc" } },
  businessCase: { include: { costItems: true } },
  handover: { orderBy: { order: "asc" }, include: { recommendation: true } },
  risks: true,
  tracks: true,
  engagement: { include: { stakeholders: true } },
} satisfies Prisma.StudyInclude;

export type StudyWithCvr = Prisma.StudyGetPayload<{ include: typeof cvrInclude }>;

export function assembleCvrData(study: StudyWithCvr): CvrData {
  const bc = study.businessCase;
  const cur = bc?.currency ?? study.currency;
  const dr = bc?.discountRatePct ?? 10;

  const lines: CashFlowLine[] = (bc?.costItems ?? []).map((c) => ({ label: c.label, kind: c.kind as CashFlowLine["kind"], amount: c.amount, year: c.year, recurring: c.recurring }));
  const fin = computeFinance(lines, { discountRatePct: dr, horizonYears: bc?.horizonYears ?? 5 });

  const active = (c: { year?: number | null; recurring: boolean }, y: number) => (c.recurring || c.year == null ? true : c.year === y);
  const YRS = [0, 1, 2];
  const benefitBy = YRS.map((y) => (bc?.costItems ?? []).filter((c) => c.kind === "BENEFIT" && active(c, y)).reduce((s, c) => s + c.amount, 0));
  const costBy = YRS.map((y) => (bc?.costItems ?? []).filter((c) => c.kind !== "BENEFIT" && active(c, y)).reduce((s, c) => s + c.amount, 0));
  const cum: number[] = []; benefitBy.reduce((a, b, i) => (cum[i] = a + b), 0);
  const netBy = YRS.map((y) => benefitBy[y] - costBy[y]);
  const dcfBy = YRS.map((y) => netBy[y] / Math.pow(1 + dr / 100, y + 1));
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const money3 = (arr: number[]) => ({ y1: fmtMoney(arr[0], cur), y2: fmtMoney(arr[1], cur), y3: fmtMoney(arr[2], cur) });

  const financialRows: CvrData["financialRows"] = [
    { label: "Annual benefit", ...money3(benefitBy), total: fmtMoney(sum(benefitBy), cur) },
    { label: "Cumulative benefit", ...money3(cum) },
    ...(bc?.costItems ?? []).filter((c) => c.kind !== "BENEFIT").slice(0, 5).map((c) => {
      const per = YRS.map((y) => (active(c, y) ? c.amount : 0));
      return { label: c.label, ...money3(per), total: fmtMoney(sum(per), cur) };
    }),
    { label: "Total investment", ...money3(costBy), total: fmtMoney(sum(costBy), cur), emph: true },
    { label: "Net cash flow", ...money3(netBy), total: fmtMoney(sum(netBy), cur) },
    { label: "Discounted cash flow", ...money3(dcfBy) },
  ];

  const benefits = study.handover.filter((a) => a.type === "EXPECTED_BENEFIT");
  const successCriteria = study.handover.filter((a) => a.type === "SUCCESS_CRITERION");
  const shortlistRecs = study.recommendations.filter((r) => r.status === "ACCEPTED");
  const useCaseRecs = (shortlistRecs.length ? shortlistRecs : study.recommendations).slice(0, 4);
  const catLabel = (a: (typeof benefits)[number]) => {
    const c = (a.data as { category?: string } | null)?.category;
    return c ? c.replaceAll("_", " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()) : "Benefit";
  };

  return {
    customerName: study.customerName?.trim() || study.title,
    studyTitle: study.title,
    studyCode: study.code,
    presenter: study.owner.name,
    currency: cur,
    realized: false,
    whyDoSomething: study.problemStatement ?? undefined,
    whatsNext: bc?.executiveSummary ?? undefined,
    useCaseLine: study.recommendations.length ? "USE CASES:  " + study.recommendations.slice(0, 4).map((r) => r.title).join("  ·  ") : undefined,
    participants: (study.engagement?.stakeholders ?? []).map((sk) => ({ name: sk.name, title: sk.title ?? sk.role })),
    proofPoints: study.infoItems.filter((i) => ["cost", "performance", "constraint"].includes(i.category ?? "")).slice(0, 4).map((i) => ({ value: (i.value ?? "•").slice(0, 10), label: i.label, description: i.source ?? undefined })),
    priorities: [],
    initiatives: study.recommendations.slice(0, 3).map((r) => ({ title: r.title, detail: r.summary ?? r.technicalDetail ?? undefined, quote: r.commercialDetail ?? undefined })),
    driversEnablers: study.functions.slice(0, 4).map((f) => ({ driver: "<Business driver>", enabler: `${f.verb} ${f.noun}` })),
    benefitRows: benefits.slice(0, 5).map((a) => ({ useCase: a.recommendation?.title ?? a.title, group: catLabel(a), benefits: a.detail ?? a.title })),
    currentState: study.infoItems.slice(0, 6).map((i) => `${i.label}${i.value ? ": " + i.value : ""}`),
    implications: study.risks.slice(0, 6).map((r) => r.title),
    futureState: study.recommendations.slice(0, 6).map((r) => r.title),
    keyBenefits: benefits.slice(0, 6).map((a) => a.title),
    useCases: useCaseRecs.map((r) => ({ title: r.title, future: r.summary ?? r.technicalDetail ?? undefined, benefits: r.commercialDetail ?? undefined })),
    roiPct: fmtPct(fin.roiPct),
    paybackMonths: fin.paybackMonths != null ? `${fin.paybackMonths.toFixed(1)} months` : "—",
    npv: fmtMoney(fin.npv, cur),
    financialRows,
    results: [
      { label: "Return on Investment", value: fmtPct(fin.roiPct) },
      { label: "Net Present Value", value: fmtMoney(fin.npv, cur) },
      { label: "Payback (months)", value: fin.paybackMonths != null ? fin.paybackMonths.toFixed(1) : "—" },
      { label: "Annual discount rate", value: fmtPct(dr) },
    ],
    nextSteps: successCriteria.slice(0, 4).map((a) => ({ area: a.title, detail: a.detail ?? "" })),
  };
}
