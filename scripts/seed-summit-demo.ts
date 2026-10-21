/* Demo seed: a fictitious "Summit Bank" Control-M engagement taken all the way
 * through VE -> VR -> CS, in a mature / healthy (GREEN) state — for walking
 * people through the finished end result in the app. ADDITIVE and idempotent:
 * it deletes its own Summit records first, then recreates them. Does NOT touch
 * the rest of the demo org.
 *
 * Local:  npx tsx scripts/seed-summit-demo.ts
 * Prod:   DATABASE_URL="<prod-neon-url>" npx tsx scripts/seed-summit-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { VE_PHASES, VR_PHASES } from "../src/lib/domain/phases";
import { CS_STAGES } from "../src/lib/domain/cs-stages";
import { HEALTH_FACTORS, overallScore } from "../src/lib/domain/cs-health";
import { DEFAULT_CRITERIA, weightedScore } from "../src/lib/evaluation";

const prisma = new PrismaClient();
const ORG = "org_demo";
const CUR = "ZAR";
const VE_CODE = "VE-2026-030", VR_CODE = "VR-2026-030", CS_CODE = "CS-2026-010";
const ACCOUNT = "Summit Bank";

async function pickUser(...prefs: string[]) {
  const users = await prisma.user.findMany({ where: { organizationId: ORG }, select: { id: true } });
  const ids = new Set(users.map((u) => u.id));
  for (const p of prefs) if (ids.has(p)) return p;
  return users[0]?.id;
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { id: ORG }, select: { id: true } });
  if (!org) throw new Error(`Org ${ORG} not found — run against a DB that has the demo org.`);
  const team = (await prisma.team.findFirst({ where: { organizationId: ORG }, select: { id: true } }))?.id ?? null;
  const uVE = await pickUser("u_ve", "u_admin");
  const uVRM = await pickUser("u_vrm", "u_admin", "u_ve");
  const uCSM = await pickUser("u_vrm", "u_admin", "u_ve");

  // --- idempotent cleanup (delete our own records first) ---
  await prisma.realizationTrack.deleteMany({ where: { code: VR_CODE, organizationId: ORG } });
  await prisma.study.deleteMany({ where: { code: VE_CODE, organizationId: ORG } });
  await prisma.customerSuccessEngagement.deleteMany({ where: { code: CS_CODE, organizationId: ORG } });
  console.log("cleaned any existing Summit Bank demo records");

  // ============================= VE STUDY =============================
  const s = await prisma.study.create({
    data: {
      code: VE_CODE, title: `${ACCOUNT} — Control-M Batch Automation VE`,
      summary: "Workload-automation value study: prove and grow the value of the Control-M estate — consolidate legacy schedulers, protect overnight batch SLAs, avoid extra MQ licensing via managed file transfer, and lift jobs-as-code adoption.",
      status: "HANDED_OVER", organizationId: ORG, teamId: team, industryKey: "automation", ownerId: uVE,
      studyType: "Automation value study",
      problemStatement: "A large Control-M estate (~30,000 licensed tasks, 68.8% avg / 94.4% peak) is business-critical but its value is unmeasured; legacy schedulers persist, ~160 jobs fail/rerun a month, and overnight SLAs are at risk.",
      whyNow: "Control-M renewal falls in March 2027 and the estate is at 94.4% peak utilisation — close to the licence ceiling. Procurement will press on price unless value is proven, and overnight-batch SLA breaches are already drawing executive attention.",
      whyThisSolution: "Control-M is already the strategic orchestration platform; consolidating the remaining legacy schedulers and managed file transfer onto it — rather than adding new tools — compounds the existing investment. Blue Turtle runs Control-M at scale and brings the jobs-as-code and MFT patterns that de-risk the migration.",
      valueStory: {
        priorities: [
          { title: "Protect overnight batch", bullets: ["Overnight batch must hit SLA every night", "No business-day impact from failed jobs", "Peak capacity headroom protected"] },
          { title: "Prove the value", bullets: ["Measure realised value, not just licences held", "A board-ready value story before renewal", "Evidence, not estimates"] },
          { title: "Simplify & consolidate", bullets: ["Retire the remaining legacy schedulers", "One orchestration estate to run and support", "Avoid new MQ licensing via managed file transfer"] },
        ],
        priorityQuote: "We don't want another scheduler — we want the one we already have to run everything, reliably, and to prove it's paying for itself.",
        priorityQuoteBy: "Head of Central Services",
        drivers: [
          { driver: "Renewal & cost pressure", enabler: "Realised-value reporting plus legacy-licence takeout savings" },
          { driver: "SLA risk on overnight batch", enabler: "Self-healing jobs-as-code with auto-rerun and proactive alerting" },
          { driver: "Tool & licence sprawl", enabler: "Scheduler and managed-file-transfer consolidation onto Control-M" },
          { driver: "Thin peak headroom (94.4%)", enabler: "Peak-based capacity forecast and right-sizing before any expansion" },
        ],
        collabStats: [
          { value: "120", label: "Total hours" },
          { value: "4", label: "Technical workshops" },
          { value: "9", label: "Stakeholder interviews" },
          { value: "30k", label: "Tasks analysed" },
        ],
        deliveryTeam: [
          { name: "Paul Goncalves", role: "Value Engineer" },
          { name: "Thandi Mokoena", role: "Value Realisation Manager" },
          { name: "Derek Pillay", role: "Control-M Solution Architect" },
        ],
      },
      infoItems: { create: [
        { label: "Licensed tasks", value: "30,000 licensed tasks", category: "cost", source: "Licence schedule" },
        { label: "Peak utilisation", value: "94.4% at peak", category: "performance", source: "Usage report" },
        { label: "Average utilisation", value: "68.8% average", category: "performance", source: "Usage report" },
        { label: "Failed / rerun jobs", value: "~160 per month", category: "performance", source: "Control-M reporting" },
        { label: "Legacy schedulers live", value: "2 still in production", category: "constraint", source: "Estate review" },
        { label: "Overnight SLA attainment", value: "95%, with month-end breaches", category: "performance", source: "Service reporting" },
      ] },
      scope: "In: batch orchestration, failure recovery, scheduler & MFT consolidation, SLA management, jobs-as-code. Out: application code changes.",
      estimatedValue: 2_400_000, currency: CUR, evaluationCriteria: DEFAULT_CRITERIA as object,
      startedAt: new Date("2026-05-18"), targetDate: new Date("2026-06-26"),
      phases: { create: VE_PHASES.map((p) => ({ phase: p.key as never, order: p.order, status: "COMPLETE" as never, completedAt: new Date("2026-06-24") })) },
      functions: {
        create: [
          { verb: "Orchestrate", noun: "workloads", kind: "BASIC", cost: 520000, worth: 380000, order: 1 },
          { verb: "Recover", noun: "failures", kind: "BASIC", cost: 300000, worth: 260000, order: 2 },
          { verb: "Meet", noun: "SLAs", kind: "SECONDARY", cost: 200000, worth: 120000, order: 3 },
          { verb: "Consolidate", noun: "schedulers", kind: "SECONDARY", cost: 180000, worth: 150000, order: 4 },
          { verb: "Transfer", noun: "files", kind: "SECONDARY", cost: 150000, worth: 180000, order: 5 },
          { verb: "Monitor", noun: "platforms", kind: "SECONDARY", cost: 120000, worth: 90000, order: 6 },
        ],
      },
      recommendations: {
        create: [
          { title: "Consolidate legacy schedulers onto Control-M", summary: "Retire remaining legacy schedulers and orchestrate all batch on a single Control-M estate.", technicalDetail: "Migrate legacy scheduler jobs to Control-M with SLA management and dependency modelling.", commercialDetail: "Removes scheduler licence + maintenance and cuts rerun/firefighting effort.", currentState: "Two legacy schedulers run in parallel with Control-M; jobs are duplicated and reruns are hand-held.", implications: "Duplicate licence and maintenance spend, plus fragile month-end batch where every rerun needs an operator.", status: "ACCEPTED", estimatedValue: 1_200_000, estimatedCost: 150000, order: 1 },
          { title: "Automate failure recovery with jobs-as-code", summary: "Self-healing job flows with auto-rerun, alerting and version-controlled definitions.", technicalDetail: "Jobs-as-code pipelines with automated recovery runbooks and proactive alerting.", commercialDetail: "Cuts failed-job impact and manual intervention hours; lifts first-time success.", currentState: "~160 jobs fail or rerun each month; recovery is manual and job definitions are not version-controlled.", implications: "Overnight SLA breaches and sustained firefighting effort, with no auditable change history.", status: "ACCEPTED", estimatedValue: 600_000, estimatedCost: 120000, order: 2 },
          { title: "Consolidate managed file transfer onto Control-M", summary: "Move file transfer onto Control-M MFT to avoid additional IBM MQ licensing.", technicalDetail: "Control-M Managed File Transfer replaces point MFT and avoids MQ expansion.", commercialDetail: "Avoids MQ licence growth and reduces integration tooling.", currentState: "File transfer runs on separate tooling that drives additional IBM MQ licensing.", implications: "Avoidable MQ licence growth and extra integration tooling to support and secure.", status: "ACCEPTED", estimatedValue: 600_000, estimatedCost: 90000, order: 3 },
        ],
      },
      risks: {
        create: [
          { title: "Cutover risk during scheduler migration", likelihood: 3, impact: 4, mitigation: "Phased cutover with parallel run and rollback.", status: "MITIGATING" },
          { title: "Thin licence headroom at peak (94.4%)", likelihood: 3, impact: 3, mitigation: "Peak-based capacity forecast; right-size before any expansion.", status: "OPEN" },
          { title: "Value left unproven at renewal", likelihood: 3, impact: 4, mitigation: "Stand up realised-value reporting and a board-ready value story before procurement engages.", status: "OPEN" },
        ],
      },
    },
    include: { recommendations: true, functions: true },
  });

  const fnBy = (verb: string) => s.functions.find((f) => f.verb === verb)?.id ?? null;
  for (const [verb, parent] of [["Orchestrate", null], ["Recover", fnBy("Orchestrate")], ["Meet", fnBy("Orchestrate")], ["Consolidate", fnBy("Meet")], ["Transfer", fnBy("Orchestrate")], ["Monitor", fnBy("Orchestrate")]] as [string, string | null][]) {
    const id = fnBy(verb); if (id) await prisma.functionItem.update({ where: { id }, data: { parentId: parent } });
  }
  for (const a of [
    { idea: "Consolidate remaining legacy schedulers onto Control-M", functionId: fnBy("Consolidate"), scores: { cost: 5, performance: 4, risk: 3, feasibility: 4, schedule: 4 }, shortlisted: true },
    { idea: "Self-healing job flows (auto-rerun + alerting)", functionId: fnBy("Recover"), scores: { cost: 4, performance: 5, risk: 2, feasibility: 4, schedule: 4 }, shortlisted: true },
    { idea: "Control-M managed file transfer (avoid MQ licensing)", functionId: fnBy("Transfer"), scores: { cost: 5, performance: 3, risk: 2, feasibility: 4, schedule: 3 }, shortlisted: true },
    { idea: "Keep legacy schedulers + more scripting (do-minimum)", functionId: fnBy("Recover"), scores: { cost: 2, performance: 5, risk: 4, feasibility: 5, schedule: 2 }, shortlisted: false },
  ]) {
    await prisma.alternative.create({ data: { studyId: s.id, idea: a.idea, functionId: a.functionId, scores: a.scores, weightedScore: weightedScore(a.scores, DEFAULT_CRITERIA), shortlisted: a.shortlisted } });
  }

  const bc = await prisma.businessCase.create({
    data: {
      studyId: s.id, currency: CUR,
      executiveSummary: "Three accepted recommendations deliver ~R2.4M annual net value — legacy-scheduler takeout, failed-job/firefighting reduction, and MQ licensing avoidance via managed file transfer — against a R2.1M investment: ~14-month payback and ~310% five-year ROI (NPV ~R5.6M at 8%).",
      roiPct: 312, paybackMonths: 14, npv: 5_600_000, irrPct: 78, discountRatePct: 8, horizonYears: 5,
      lccaNotes: "Retiring legacy schedulers and point MFT removes licence + maintenance across the horizon; Control-M subscription is the main ongoing cost.",
      riskNarrative: "Primary risk is migration cutover (parallel-run + rollback); thin peak headroom managed with a capacity forecast.",
      scenarios: { create: [
        { name: "Baseline (legacy schedulers + point MFT)", isBaseline: true, order: 0, description: "Legacy schedulers with frequent reruns; separate MFT tooling and MQ licensing." },
        { name: "Proposed (consolidated on Control-M)", isBaseline: false, order: 1, description: "Single Control-M estate with self-healing flows and managed file transfer." },
      ] },
      costItems: { create: [
        { label: "Control-M migration & setup", kind: "ONE_OFF", amount: 1_500_000, year: 0 },
        { label: "Runbook automation build & training", kind: "ONE_OFF", amount: 600_000, year: 0 },
        { label: "Legacy scheduler licence & maintenance takeout", kind: "BENEFIT", category: "COST_SAVING", amount: 1_200_000, recurring: true },
        { label: "Managed file transfer — MQ licensing avoidance", kind: "BENEFIT", category: "COST_SAVING", amount: 600_000, recurring: true },
        { label: "Failed-job / rerun reduction", kind: "BENEFIT", category: "COST_SAVING", amount: 400_000, recurring: true },
        { label: "Manual firefighting effort saving", kind: "BENEFIT", category: "COST_SAVING", amount: 200_000, recurring: true },
        { label: "Control-M subscription & support", kind: "OPEX", amount: 500_000, recurring: true },
      ] },
    },
  });

  for (const h of [
    { type: "EXPECTED_BENEFIT", title: "Automation, consolidation & MFT saving", detail: "R2.4M annual saving from takeout + failure reduction + MQ avoidance", data: { plannedValue: 2400000, category: "COST_SAVING" }, order: 0 },
    { type: "EXPECTED_BENEFIT", title: "Overnight SLA attainment restored", detail: "Overnight batch SLA attainment lifted from 95% to ≥98%", data: { category: "RISK_REDUCTION" }, order: 6 },
    { type: "EXPECTED_BENEFIT", title: "Failed-job firefighting reduced", detail: "Failed / rerun jobs cut from ~160 to <80 a month via self-healing runbooks", data: { category: "TIME_SAVING" }, order: 7 },
    { type: "KPI", title: "SLA attainment", detail: "Overnight batch SLA attainment", data: { kpiKey: "sla_attainment", baselineValue: 95, targetValue: 98.5, unit: "%", frequency: "monthly", dataSource: "Control-M", owner: "Ops" }, order: 1 },
    { type: "KPI", title: "Job success rate", detail: "First-time job completion", data: { kpiKey: "job_success_rate", baselineValue: 96, targetValue: 99.5, unit: "%", frequency: "monthly", dataSource: "Control-M", owner: "Ops" }, order: 2 },
    { type: "BASELINE", title: "Baseline utilisation", detail: "68.8% average / 94.4% peak of 30,000 tasks", data: { value: 68.8 }, order: 3 },
    { type: "SUCCESS_CRITERION", title: "Legacy schedulers retired", detail: "All legacy schedulers consolidated onto Control-M", order: 4 },
    { type: "RISK", title: "Migration cutover", detail: "Risk during scheduler consolidation", order: 5 },
  ]) {
    await prisma.handoverArtifact.create({ data: { studyId: s.id, type: h.type as never, title: h.title, detail: h.detail, data: (h as any).data ?? undefined, order: h.order, recommendationId: s.recommendations[0]?.id } });
  }
  await prisma.kpiTarget.create({ data: { kpiKey: "cost_savings", studyId: s.id, baselineValue: 3_400_000, targetValue: 2_400_000, unit: CUR, frequency: "once", dataSource: "Cost model", ownerName: "Paul Goncalves" } });
  await prisma.comment.create({ data: { authorId: uVE, body: "Strong, well-sourced case. Confirm the parallel-run plan and the MQ-avoidance numbers with procurement before approval.", entityType: "Study", entityId: s.id, studyId: s.id } });

  // ============================= VR TRACK =============================
  const t = await prisma.realizationTrack.create({
    data: {
      code: VR_CODE, title: `${ACCOUNT} Control-M — Value Realisation`, status: "IN_FLIGHT", health: "GREEN",
      organizationId: ORG, teamId: team, industryKey: "automation", studyId: s.id, ownerId: uVRM,
      objectives: "Prove and grow the realised value of Control-M: retire legacy schedulers, lift job success & SLA attainment, consolidate MFT (avoid MQ licensing), and extend jobs-as-code.",
      successCriteria: "≥R2.1M realised annual value; ≥98% overnight-batch SLA attainment; legacy schedulers retired.",
      plannedValue: 2_400_000, realizedValue: 1_500_000, currency: CUR,
      startedAt: new Date("2026-06-26"), targetDate: new Date("2027-01-31"),
      phases: { create: VR_PHASES.map((p) => ({ phase: p.key as never, order: p.order, status: (p.order <= 4 ? "COMPLETE" : p.order === 5 ? "IN_PROGRESS" : "NOT_STARTED") as never })) },
      workPackages: { create: [
        { name: "Right-size & baseline the estate", status: "DONE", ownerId: uVRM, isMilestone: true, order: 1, startDate: new Date("2026-07-01"), dueDate: new Date("2026-07-31"), recommendationId: s.recommendations[0]?.id },
        { name: "Build self-healing runbooks (jobs-as-code)", status: "DONE", ownerId: uVRM, order: 2, dueDate: new Date("2026-08-28"), recommendationId: s.recommendations[1]?.id },
        { name: "Stand up value & SLA reporting", status: "DONE", ownerId: uVRM, order: 3, dueDate: new Date("2026-08-15") },
        { name: "Decommission legacy schedulers", status: "IN_PROGRESS", ownerId: uVRM, order: 4, dueDate: new Date("2026-11-30") },
        { name: "Consolidate managed file transfer", status: "IN_PROGRESS", ownerId: uVRM, order: 5, dueDate: new Date("2026-12-15"), recommendationId: s.recommendations[2]?.id },
        { name: "Cut over remaining workloads", status: "NOT_STARTED", order: 6, isMilestone: true, dueDate: new Date("2027-01-20") },
      ] },
      benefits: { create: [
        { label: "Scheduler licence & maintenance saving", category: "COST_SAVING", plannedValue: 1_200_000, realizedValue: 820_000, currency: CUR, firstMeasuredAt: new Date("2026-08-20") },
        { label: "Managed file transfer — MQ licensing avoidance", category: "COST_SAVING", plannedValue: 600_000, realizedValue: 350_000, currency: CUR, firstMeasuredAt: new Date("2026-09-10") },
        { label: "Failed-job / rerun reduction", category: "COST_SAVING", plannedValue: 400_000, realizedValue: 230_000, currency: CUR, firstMeasuredAt: new Date("2026-09-05") },
        { label: "Manual firefighting saving", category: "TIME_SAVING", plannedValue: 200_000, realizedValue: 100_000, currency: CUR, firstMeasuredAt: new Date("2026-09-20") },
      ] },
      risks: { create: [{ title: "Residual jobs on a legacy tool", likelihood: 2, impact: 3, mitigation: "Track and migrate remaining jobs before decommission.", status: "OPEN" }] },
      adoptionPlan: { create: {
        changeImpact: "Ops & integration teams adopt jobs-as-code and Control-M self-service; runbooks replace manual firefighting.",
        trainingPlan: "Control-M authoring & jobs-as-code training; on-call runbook walkthroughs.",
        commsPlan: "Weekly ops standup; monthly steering update.",
        championNetwork: "Batch lead + SRE as automation champions.",
        activities: { create: [
          { label: "Control-M authoring & jobs-as-code training", audience: "Ops & integration teams", status: "DONE", order: 1 },
          { label: "SLA/value dashboard rollout", audience: "Operators & service owners", status: "DONE", order: 2 },
          { label: "Runbook / on-call walkthrough", audience: "SRE / on-call", status: "IN_PROGRESS", order: 3 },
        ] },
      } },
    },
  });
  await prisma.handoverArtifact.updateMany({ where: { studyId: s.id }, data: { trackId: t.id } });
  await prisma.comment.create({ data: { authorId: uVRM, body: "Two legacy schedulers retired; MFT consolidation underway. Realised value tracking to plan — SLA attainment at 98%.", entityType: "RealizationTrack", entityId: t.id, trackId: t.id } });

  const kpi = (kpiKey: string, baselineValue: number, targetValue: number, unit: string, owner: string, actuals: [string, string, number, string?][]) =>
    prisma.kpiTarget.create({ data: { kpiKey, trackId: t.id, baselineValue, targetValue, unit, frequency: "monthly", dataSource: "Control-M", ownerName: owner, actuals: { create: actuals.map(([periodLabel, d, value, note]) => ({ periodLabel, periodDate: new Date(d), value, note })) } } });
  await kpi("sla_attainment", 95, 98.5, "%", "Platform team", [["2026-08", "2026-08-31", 96], ["2026-09", "2026-09-30", 97.2], ["2026-10", "2026-10-31", 98.1, "Overnight SLAs consistently met."]]);
  await kpi("job_success_rate", 96, 99.5, "%", "Platform team", [["2026-08", "2026-08-31", 97.4], ["2026-09", "2026-09-30", 98.6], ["2026-10", "2026-10-31", 99.1]]);
  await kpi("task_utilization", 68.8, 85, "%", "Platform team", [["2026-08", "2026-08-31", 74], ["2026-09", "2026-09-30", 79], ["2026-10", "2026-10-31", 82, "Efficiency up as workloads consolidate."]]);
  await kpi("failed_jobs", 160, 80, "count", "Platform team", [["2026-08", "2026-08-31", 128], ["2026-09", "2026-09-30", 104], ["2026-10", "2026-10-31", 88, "Self-healing runbooks reducing reruns."]]);
  await kpi("jobs_as_code_adoption", 30, 70, "%", "Enablement", [["2026-08", "2026-08-31", 42], ["2026-09", "2026-09-30", 55], ["2026-10", "2026-10-31", 63]]);

  await prisma.valueReport.create({ data: { trackId: t.id, kind: "QUARTERLY_QBR", title: `Q3 2026 QBR — ${ACCOUNT} Control-M`, periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"), content: {
    executiveStory: "On track: R1.5M of R2.4M realised, SLA attainment up from 95% to 98%, failed jobs down 35%, two legacy schedulers retired.",
    progress: "4 of 6 work packages complete; decommission and MFT consolidation in flight.",
    realizedToDate: 1500000,
    nextBestActions: ["Complete legacy decommission", "Finish MFT consolidation to lock the MQ avoidance"],
    expansion: "Extend Control-M to data pipelines; cross-sell monitoring consolidation.",
  } as object } });

  // ============================= CS ENGAGEMENT =============================
  const csStages = (advancedTo: number) => ({ create: CS_STAGES.map((st) => ({ stage: st.key as never, order: st.order, status: (st.order < advancedTo ? "COMPLETE" : st.order === advancedTo ? "IN_PROGRESS" : "NOT_STARTED") as never })) });
  const eng = await prisma.customerSuccessEngagement.create({
    data: {
      code: CS_CODE, accountName: ACCOUNT, organizationId: ORG, teamId: team, industryKey: "automation", ownerId: uCSM,
      status: "ACTIVE", healthOverall: "GREEN", arr: 6_800_000, currency: CUR, renewalDate: new Date("2027-03-31"),
      objectives: "Protect and grow value from the Control-M estate; secure the renewal and expand into data pipelines and monitoring consolidation.",
      startedAt: new Date("2026-06-26"), stages: csStages(6),
    },
  });
  await prisma.study.update({ where: { id: s.id }, data: { engagementId: eng.id } });
  await prisma.realizationTrack.update({ where: { id: t.id }, data: { engagementId: eng.id } });

  const scores = { adoption: 86, value: 84, sentiment: 82, support: 80, engagement: 83 };
  await prisma.healthScore.create({ data: { engagementId: eng.id, periodLabel: "2026-Q3", periodDate: new Date("2026-09-30"), overall: overallScore(scores), factors: HEALTH_FACTORS.map((f) => ({ key: f.key, label: f.label, score: (scores as any)[f.key], weight: f.weight })) as object, note: "Strong adoption and proven value; renewal on track." } });
  await prisma.customerSuccessEngagement.update({ where: { id: eng.id }, data: { successPlan: { commitments: "Quarterly value reviews; jobs-as-code enablement; MFT consolidation.", successCriteria: "≥98% overnight SLA; legacy schedulers retired; ≥R2.1M realised.", notes: "Executive sponsor engaged; renewal EBR booked for Q1." } as object } });
  await prisma.stakeholder.createMany({ data: [
    { engagementId: eng.id, name: "Head of Central Services", title: "Platform owner", role: "Champion", influence: 5, sentiment: "PROMOTER" },
    { engagementId: eng.id, name: "CIO office", title: "Economic buyer", role: "Sponsor", influence: 5, sentiment: "NEUTRAL" },
    { engagementId: eng.id, name: "Batch operations lead", title: "Operations", role: "User lead", influence: 3, sentiment: "PROMOTER" },
  ] });
  await prisma.actionItem.createMany({ data: [
    { engagementId: eng.id, title: "Book the renewal EBR", owner: "CS owner", status: "IN_PROGRESS", dueDate: new Date("2027-01-20") },
    { engagementId: eng.id, title: "Complete legacy scheduler decommission", owner: "Platform team", status: "IN_PROGRESS", dueDate: new Date("2026-11-30") },
    { engagementId: eng.id, title: "Draft expansion case (Control-M for Data)", owner: "CS owner", status: "OPEN" },
  ] });
  await prisma.renewalPlan.create({ data: { engagementId: eng.id, renewalDate: new Date("2027-03-31"), stage: "5 months out", valueSummary: "R1.5M realised of R2.4M; overnight SLAs restored to 98%.", risks: "One legacy scheduler still live.", procurementStatus: "Not yet engaged", plannedActions: "Book renewal EBR; finalise the value story and expansion case." } });
  await prisma.growthPlan.create({ data: { engagementId: eng.id, triggers: "Data-pipeline growth; monitoring consolidation", targetValue: 1_200_000, narrative: "Expand Control-M into data workflows (Control-M for Data) and consolidate platform monitoring." } });
  await prisma.valueReport.create({ data: { engagementId: eng.id, kind: "EXECUTIVE_EBR", title: `EBR — ${ACCOUNT}`, content: {
    executiveStory: `${ACCOUNT} is active and healthy on the Control-M automation solution, with R1.5M of R2.4M planned value realised, overnight SLAs restored to 98%, and two legacy schedulers retired. Renewal is on track and an expansion case is forming.`,
    valueSummary: "R1.5M realised of R2.4M planned (63% of plan).",
    risks: "Key risks: one legacy scheduler still live; MFT consolidation to complete before renewal.",
    nextBestActions: ["Complete legacy decommission and MFT consolidation.", "Book the renewal EBR.", "Progress the Control-M for Data expansion case."],
    expansion: "Expand Control-M into data workflows and consolidate monitoring.",
  } as object } });

  console.log(`✓ Summit Bank demo built: study ${VE_CODE} → track ${VR_CODE} → engagement ${CS_CODE}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
