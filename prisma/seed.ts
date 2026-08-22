/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { INDUSTRY_PROFILES } from "../src/lib/domain/industries";
import { VE_PHASES, VR_PHASES } from "../src/lib/domain/phases";
import { CS_STAGES } from "../src/lib/domain/cs-stages";
import { KPI_CATALOG } from "../src/lib/domain/kpis";
import { CONTENT_TEMPLATES } from "../src/lib/domain/templates";
import { DEFAULT_CRITERIA, weightedScore } from "../src/lib/evaluation";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo1234";

async function seedConfig() {
  console.log("→ Seeding solution profiles…");
  for (const p of INDUSTRY_PROFILES) {
    await prisma.industryProfile.upsert({
      where: { key: p.key },
      create: { key: p.key, name: p.name, description: p.description, config: p.config as object },
      update: { name: p.name, description: p.description, config: p.config as object },
    });
  }

  console.log("→ Seeding phase templates…");
  await prisma.phaseTemplate.deleteMany({});
  for (const ph of [...VE_PHASES, ...VR_PHASES]) {
    await prisma.phaseTemplate.create({
      data: {
        discipline: ph.discipline as "VE" | "VR",
        vePhase: ph.discipline === "VE" ? (ph.key as never) : null,
        vrPhase: ph.discipline === "VR" ? (ph.key as never) : null,
        order: ph.order,
        title: ph.title,
        purpose: ph.purpose,
        keyQuestions: ph.keyQuestions,
        content: {
          requiredInputs: ph.requiredInputs,
          tasks: ph.tasks,
          artifacts: ph.artifacts,
          exitCriteria: ph.exitCriteria,
        },
      },
    });
  }

  console.log("→ Seeding KPI definitions…");
  for (const k of KPI_CATALOG) {
    await prisma.kpiDefinition.upsert({
      where: { key: k.key },
      create: {
        key: k.key, name: k.name, description: k.description,
        discipline: k.discipline as "VE" | "VR",
        category: k.category as never, unit: k.unit,
        direction: k.direction as never, formula: k.formula,
        scope: k.scope, industryKey: k.industryKey ?? null,
      },
      update: {
        name: k.name, description: k.description, unit: k.unit,
        formula: k.formula, scope: k.scope, industryKey: k.industryKey ?? null,
      },
    });
  }

  console.log("→ Seeding content templates…");
  await prisma.contentTemplate.deleteMany({});
  for (const t of CONTENT_TEMPLATES) {
    await prisma.contentTemplate.create({
      data: {
        discipline: t.discipline as "VE" | "VR",
        kind: t.kind, title: t.title, industryKey: t.industryKey ?? null,
        body: t.body, metadata: (t.metadata as object) ?? undefined,
      },
    });
  }
}

async function seedDemo() {
  console.log("→ Seeding organization, teams & users…");
  const org = await prisma.organization.upsert({
    where: { id: "org_demo" },
    create: { id: "org_demo", name: "Meridian Value Advisory" },
    update: {},
  });

  const automationTeam = await prisma.team.upsert({
    where: { id: "team_capital" },
    create: { id: "team_capital", name: "Automation & Mainframe", organizationId: org.id },
    update: { name: "Automation & Mainframe" },
  });
  const serviceTeam = await prisma.team.upsert({
    where: { id: "team_digital" },
    create: { id: "team_digital", name: "Service & Operations", organizationId: org.id },
    update: { name: "Service & Operations" },
  });

  const users = [
    { id: "u_ve", email: "ve@demo.app", name: "Dana Okafor", title: "Value Engineer", role: "VALUE_ENGINEER" },
    { id: "u_vrm", email: "vrm@demo.app", name: "Marco Ruiz", title: "Value Realization Manager", role: "VALUE_REALIZATION_MANAGER" },
    { id: "u_rev", email: "reviewer@demo.app", name: "Priya Nair", title: "Portfolio Reviewer", role: "REVIEWER" },
    { id: "u_view", email: "viewer@demo.app", name: "Sam Lee", title: "Stakeholder", role: "VIEWER" },
    { id: "u_csm", email: "cs@demo.app", name: "Thabo Nkosi", title: "Customer Success Manager", role: "CUSTOMER_SUCCESS_MANAGER" },
    { id: "u_admin", email: "admin@demo.app", name: "Admin", title: "Administrator", role: "ADMIN" },
  ] as const;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: { id: u.id, email: u.email, name: u.name, title: u.title, organizationId: org.id, passwordHash },
      update: { name: u.name, title: u.title, passwordHash },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: u.id, organizationId: org.id } },
      create: { userId: u.id, organizationId: org.id, role: u.role as never },
      update: { role: u.role as never },
    });
  }

  // Clean demo domain data (config is preserved).
  console.log("→ Resetting demo studies, tracks & engagements…");
  await prisma.customerSuccessEngagement.deleteMany({ where: { organizationId: org.id } });
  await prisma.realizationTrack.deleteMany({ where: { organizationId: org.id } });
  await prisma.study.deleteMany({ where: { organizationId: org.id } });

  // Remove the old generic industry profiles (now that no studies reference them).
  await prisma.industryProfile.deleteMany({ where: { key: { in: ["construction", "manufacturing", "saas"] } } });

  // --- Demo study 1: Control-M automation (fully handed over → live VR track) ---
  console.log("→ Building demo study 1 (Control-M automation)…");
  const s1 = await prisma.study.create({
    data: {
      code: "VE-2026-014",
      title: "Retail Bank — Control-M Batch Automation VE",
      summary: "Automation value study consolidating legacy schedulers onto BMC Control-M to cut failures and protect overnight batch SLAs.",
      status: "HANDED_OVER",
      organizationId: org.id,
      teamId: automationTeam.id,
      industryKey: "automation",
      ownerId: "u_ve",
      studyType: "Automation value study",
      problemStatement: "Three legacy schedulers drive ~120 failed / rerun jobs a month and missed overnight SLAs that delay morning reporting.",
      scope: "In: batch orchestration, failure recovery, scheduler consolidation. Out: application code changes.",
      estimatedValue: 1_250_000,
      currency: "USD",
      evaluationCriteria: DEFAULT_CRITERIA as object,
      startedAt: new Date("2026-05-04"),
      targetDate: new Date("2026-06-20"),
      phases: {
        create: VE_PHASES.map((p) => ({
          phase: p.key as never,
          order: p.order,
          status: "COMPLETE" as never,
          completedAt: new Date("2026-06-15"),
        })),
      },
      functions: {
        create: [
          { verb: "Orchestrate", noun: "workloads", kind: "BASIC", cost: 420000, worth: 300000, order: 1 },
          { verb: "Recover", noun: "failures", kind: "BASIC", cost: 260000, worth: 220000, order: 2 },
          { verb: "Meet", noun: "SLAs", kind: "SECONDARY", cost: 180000, worth: 90000, order: 3 },
          { verb: "Consolidate", noun: "schedulers", kind: "SECONDARY", cost: 140000, worth: 110000, order: 4 },
        ],
      },
      recommendations: {
        create: [
          { title: "Consolidate legacy schedulers onto Control-M", summary: "Retire the three legacy schedulers and orchestrate all batch on Control-M.", technicalDetail: "Migrate AutoSys + cron + a legacy tool to a single Control-M estate with SLA management.", commercialDetail: "Removes scheduler licences + maintenance and cuts rerun/firefighting effort.", status: "ACCEPTED", estimatedValue: 780000, estimatedCost: 60000, order: 1 },
          { title: "Automate failure recovery with jobs-as-code", summary: "Self-healing job flows with auto-rerun, alerting and version-controlled definitions.", technicalDetail: "Jobs-as-code with automated recovery runbooks and proactive alerting.", commercialDetail: "Cuts failed-job impact and manual intervention hours.", status: "ACCEPTED", estimatedValue: 470000, estimatedCost: 90000, order: 2 },
        ],
      },
      risks: {
        create: [
          { title: "Cutover risk during scheduler migration", likelihood: 3, impact: 4, mitigation: "Phased cutover with parallel run and rollback.", status: "MITIGATING" },
        ],
      },
    },
    include: { recommendations: true, functions: true },
  });

  // Creative alternatives + evaluation scores for study 1 (populates the matrix).
  const fnBy = (verb: string) => s1.functions.find((f) => f.verb === verb)?.id ?? null;

  // FAST how/why chain: Orchestrate workloads → (Recover failures, Meet SLAs) → Consolidate schedulers
  const fastLinks: [string, string | null][] = [
    ["Orchestrate", null],
    ["Recover", fnBy("Orchestrate")],
    ["Meet", fnBy("Orchestrate")],
    ["Consolidate", fnBy("Meet")],
  ];
  for (const [verb, parentId] of fastLinks) {
    const id = fnBy(verb);
    if (id) await prisma.functionItem.update({ where: { id }, data: { parentId } });
  }

  const seededAlts = [
    { idea: "Consolidate AutoSys + cron onto a single Control-M estate", functionId: fnBy("Consolidate"), scores: { cost: 5, performance: 4, risk: 3, feasibility: 4, schedule: 4 }, shortlisted: true },
    { idea: "Self-healing job flows (auto-rerun + alerting)", functionId: fnBy("Recover"), scores: { cost: 4, performance: 4, risk: 2, feasibility: 3, schedule: 3 }, shortlisted: true },
    { idea: "Control-M for Data pipeline orchestration", functionId: fnBy("Orchestrate"), scores: { cost: 3, performance: 4, risk: 3, feasibility: 3, schedule: 5 }, shortlisted: false },
    { idea: "Keep legacy schedulers + more scripting (do-minimum)", functionId: fnBy("Recover"), scores: { cost: 2, performance: 5, risk: 4, feasibility: 5, schedule: 2 }, shortlisted: false },
  ];
  for (const a of seededAlts) {
    await prisma.alternative.create({
      data: {
        studyId: s1.id,
        idea: a.idea,
        functionId: a.functionId,
        scores: a.scores,
        weightedScore: weightedScore(a.scores, DEFAULT_CRITERIA),
        shortlisted: a.shortlisted,
      },
    });
  }

  // Business case for study 1
  const bc1 = await prisma.businessCase.create({
    data: {
      studyId: s1.id,
      executiveSummary: "Two accepted recommendations deliver ~R1.25M annual net value — legacy-scheduler licence takeout plus failed-job and firefighting reduction — against a R1.6M investment: about a 15-month payback and ~290% five-year ROI (NPV ~R3.4M at 8%).",
      currency: "USD",
      roiPct: 291,
      paybackMonths: 15,
      npv: 3_390_000,
      irrPct: 73,
      discountRatePct: 8,
      horizonYears: 5,
      lccaNotes: "Retiring two schedulers removes licence + maintenance and cuts rerun/firefighting effort across the horizon.",
      riskNarrative: "Primary risk is migration cutover; mitigated with a parallel-run and rollback plan.",
      scenarios: {
        create: [
          { name: "Baseline (three legacy schedulers)", isBaseline: true, order: 0, description: "AutoSys + cron + a legacy tool, with frequent reruns." },
          { name: "Proposed (consolidated on Control-M)", isBaseline: false, order: 1, description: "Single Control-M estate with self-healing job flows." },
        ],
      },
      costItems: {
        create: [
          { label: "Control-M migration & setup", kind: "ONE_OFF", amount: 1_150_000, year: 0 },
          { label: "Runbook automation build & training", kind: "ONE_OFF", amount: 450000, year: 0 },
          { label: "Legacy scheduler licence & maintenance takeout", kind: "BENEFIT", category: "COST_SAVING", amount: 950000, recurring: true },
          { label: "Failed-job / rerun reduction", kind: "BENEFIT", category: "COST_SAVING", amount: 400000, recurring: true },
          { label: "Manual firefighting effort saving", kind: "BENEFIT", category: "COST_SAVING", amount: 250000, recurring: true },
          { label: "Control-M subscription & support", kind: "OPEX", amount: 350000, recurring: true },
        ],
      },
    },
  });

  // Handover artifacts for study 1
  const handoverData = [
    { type: "EXPECTED_BENEFIT", title: "Automation & consolidation saving", detail: "R1.25M annual saving from licence takeout + failure reduction", data: { plannedValue: 1250000, category: "COST_SAVING" }, order: 0 },
    { type: "KPI", title: "SLA attainment", detail: "Overnight batch SLA attainment", data: { kpiKey: "sla_attainment", baselineValue: 82, targetValue: 98, unit: "%", frequency: "monthly", dataSource: "Control-M", owner: "Marco Ruiz" }, order: 1 },
    { type: "KPI", title: "Job success rate", detail: "First-time job completion rate", data: { kpiKey: "job_success_rate", baselineValue: 94, targetValue: 99.5, unit: "%", frequency: "monthly", dataSource: "Control-M", owner: "Ops" }, order: 2 },
    { type: "BASELINE", title: "Baseline annual scheduling cost", detail: "R3.2M legacy scheduler + rerun cost", data: { value: 3200000 }, order: 3 },
    { type: "SUCCESS_CRITERION", title: "No missed regulatory SLAs", detail: "Zero missed regulatory-reporting SLAs post-cutover", order: 4 },
    { type: "RISK", title: "Migration cutover", detail: "Risk during scheduler consolidation", order: 5 },
  ];
  for (const h of handoverData) {
    await prisma.handoverArtifact.create({
      data: { studyId: s1.id, type: h.type, title: h.title, detail: h.detail, data: (h as any).data ?? undefined, order: h.order, recommendationId: s1.recommendations[0]?.id },
    });
  }

  // KPI targets on the study (VE planned)
  await prisma.kpiTarget.create({
    data: { kpiKey: "cost_savings", studyId: s1.id, baselineValue: 3200000, targetValue: 1250000, unit: "USD", frequency: "once", dataSource: "Cost model", ownerName: "Dana Okafor" },
  });

  // Discussion on study 1
  await prisma.comment.create({ data: { authorId: "u_rev", body: "Strong case. Please confirm the parallel-run plan and rollback criteria before we approve the cutover.", entityType: "Study", entityId: s1.id, studyId: s1.id } });
  await prisma.comment.create({ data: { authorId: "u_ve", body: "Parallel run is scheduled for two batch cycles — I'll attach the rollback criteria and update the risk register.", entityType: "Study", entityId: s1.id, studyId: s1.id } });

  // Business-case version snapshot (v1)
  const bc1full = await prisma.businessCase.findUnique({ where: { id: bc1.id }, include: { scenarios: { orderBy: { order: "asc" } }, costItems: true } });
  if (bc1full) {
    await prisma.documentVersion.create({
      data: {
        entityType: "BusinessCase", entityId: bc1.id, version: 1, authorId: "u_ve", studyId: s1.id,
        snapshot: {
          executiveSummary: bc1full.executiveSummary, currency: bc1full.currency, roiPct: bc1full.roiPct,
          paybackMonths: bc1full.paybackMonths, npv: bc1full.npv, irrPct: bc1full.irrPct,
          discountRatePct: bc1full.discountRatePct, horizonYears: bc1full.horizonYears,
          lccaNotes: bc1full.lccaNotes, riskNarrative: bc1full.riskNarrative,
          scenarios: bc1full.scenarios.map((s) => ({ name: s.name, isBaseline: s.isBaseline, description: s.description, order: s.order })),
          costItems: bc1full.costItems.map((c) => ({ label: c.label, kind: c.kind, category: c.category, amount: c.amount, year: c.year, recurring: c.recurring })),
        } as object,
      },
    });
  }

  // --- Value Realization track for study 1 ---
  console.log("→ Building realization track for study 1…");
  const t1 = await prisma.realizationTrack.create({
    data: {
      code: "VR-2026-014",
      title: "Control-M Automation — Realization",
      status: "IN_FLIGHT",
      health: "GREEN",
      organizationId: org.id,
      teamId: automationTeam.id,
      industryKey: "automation",
      studyId: s1.id,
      ownerId: "u_vrm",
      objectives: "Consolidate schedulers onto Control-M and prove the R1.25M annual saving and SLA improvement.",
      successCriteria: "≥R1.1M realized annual saving and ≥98% overnight-batch SLA attainment.",
      plannedValue: 1_250_000,
      realizedValue: 690_000,
      currency: "USD",
      startedAt: new Date("2026-06-20"),
      targetDate: new Date("2026-12-15"),
      phases: {
        create: VR_PHASES.map((p) => ({
          phase: p.key as never,
          order: p.order,
          status: (p.order <= 4 ? "COMPLETE" : p.order === 5 ? "IN_PROGRESS" : "NOT_STARTED") as never,
        })),
      },
      workPackages: {
        create: [
          { name: "Design Control-M target & migrate schedules", status: "DONE", ownerId: "u_vrm", isMilestone: true, order: 1, startDate: new Date("2026-06-25"), dueDate: new Date("2026-07-30"), recommendationId: s1.recommendations[0]?.id },
          { name: "Build self-healing runbooks (jobs-as-code)", status: "DONE", ownerId: "u_vrm", order: 2, dueDate: new Date("2026-08-20"), recommendationId: s1.recommendations[1]?.id },
          { name: "Decommission legacy schedulers", status: "IN_PROGRESS", ownerId: "u_vrm", order: 3, dueDate: new Date("2026-09-30") },
          { name: "Cut over remaining workloads", status: "NOT_STARTED", order: 4, isMilestone: true, dueDate: new Date("2026-12-01") },
        ],
      },
      benefits: {
        create: [
          { label: "Scheduler licence & maintenance saving", category: "COST_SAVING", plannedValue: 780000, realizedValue: 520000, firstMeasuredAt: new Date("2026-08-10") },
          { label: "Failure-recovery ops saving", category: "COST_SAVING", plannedValue: 470000, realizedValue: 170000, firstMeasuredAt: new Date("2026-09-05") },
        ],
      },
      risks: {
        create: [{ title: "Residual jobs on a legacy tool", likelihood: 2, impact: 3, mitigation: "Track and migrate the remaining jobs before decommission.", status: "OPEN" }],
      },
      adoptionPlan: {
        create: {
          changeImpact: "Ops team adopts jobs-as-code and Control-M self-service; run-books replace manual firefighting.",
          trainingPlan: "Control-M authoring & jobs-as-code training; on-call runbook walkthroughs.",
          commsPlan: "Weekly ops standup; monthly steering update.",
          championNetwork: "Batch lead + SRE as automation champions.",
          activities: {
            create: [
              { label: "Control-M authoring training", audience: "Ops team", status: "DONE", order: 1 },
              { label: "Runbook / on-call walkthrough", audience: "SRE / on-call", status: "IN_PROGRESS", order: 2 },
            ],
          },
        },
      },
    },
    include: {},
  });

  // Link handover artifacts to the track
  await prisma.handoverArtifact.updateMany({ where: { studyId: s1.id }, data: { trackId: t1.id } });

  // Discussion on the realization track
  await prisma.comment.create({ data: { authorId: "u_vrm", body: "Decommissioning the last legacy scheduler is the critical path this month — a handful of jobs still to migrate.", entityType: "RealizationTrack", entityId: t1.id, trackId: t1.id } });

  // KPI targets + actuals on the track (VR realized)
  await prisma.kpiTarget.create({
    data: { kpiKey: "sla_attainment", trackId: t1.id, baselineValue: 82, targetValue: 98, unit: "%", frequency: "monthly", dataSource: "Control-M", ownerName: "Marco Ruiz",
      actuals: { create: [
        { periodLabel: "2026-07", periodDate: new Date("2026-07-31"), value: 90 },
        { periodLabel: "2026-08", periodDate: new Date("2026-08-31"), value: 94 },
        { periodLabel: "2026-09", periodDate: new Date("2026-09-30"), value: 96, note: "Approaching target as legacy jobs migrate." },
      ] },
    },
  });
  await prisma.kpiTarget.create({
    data: { kpiKey: "on_time_implementation", trackId: t1.id, baselineValue: 0, targetValue: 90, unit: "%", frequency: "monthly", dataSource: "Plan", ownerName: "Marco Ruiz",
      actuals: { create: [
        { periodLabel: "2026-07", periodDate: new Date("2026-07-31"), value: 100 },
        { periodLabel: "2026-08", periodDate: new Date("2026-08-31"), value: 95 },
        { periodLabel: "2026-09", periodDate: new Date("2026-09-30"), value: 88 },
      ] },
    },
  });

  await prisma.valueReport.create({
    data: {
      trackId: t1.id, kind: "QUARTERLY_QBR", title: "Q3 2026 QBR — Control-M Automation",
      periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"),
      content: {
        executiveStory: "On track: R690K of R1.25M realized by end of Q3, SLA attainment up from 82% to 96%.",
        progress: "3 of 4 work packages complete or in progress; final cutover next.",
        realizedToDate: 690000,
        nextBestActions: ["Migrate the last legacy jobs", "Complete decommission and final cutover"],
        expansion: "Extend to Control-M for Data pipelines; cross-sell Helix for operations.",
      },
    },
  });

  // --- Demo study 2: BMC Helix ITSM (in-progress, not yet handed over) ---
  console.log("→ Building demo study 2 (BMC Helix ITSM)…");
  const s2 = await prisma.study.create({
    data: {
      code: "VE-2026-021",
      title: "IT Service Management — BMC Helix ROI / TCO",
      summary: "Value engineering the move from legacy ITSM to BMC Helix — ITSM, AIOps and self-service.",
      status: "IN_REVIEW",
      organizationId: org.id,
      teamId: serviceTeam.id,
      industryKey: "serviceops",
      ownerId: "u_ve",
      studyType: "ITSM value / TCO study",
      problemStatement: "High ticket volumes, long MTTR and a sprawl of monitoring tools drive cost and a poor employee experience.",
      scope: "In: ITSM, AIOps / operations, self-service. Out: HR & payroll systems.",
      estimatedValue: 2_400_000,
      currency: "USD",
      startedAt: new Date("2026-07-10"),
      targetDate: new Date("2026-08-25"),
      phases: {
        create: VE_PHASES.map((p) => ({
          phase: p.key as never,
          order: p.order,
          status: (p.order <= 5 ? "COMPLETE" : p.order === 6 ? "IN_PROGRESS" : "NOT_STARTED") as never,
        })),
      },
      recommendations: {
        create: [
          { title: "Deploy BMC Helix ITSM with AIOps & self-service", summary: "Replace legacy ITSM and point monitoring tools with BMC Helix.", technicalDetail: "Helix ITSM + Operations Management (AIOps) + Digital Workplace self-service, with Discovery for CMDB.", commercialDetail: "Subscription + implementation vs legacy ITSM licences, tool sprawl and ticket-handling cost.", status: "SHORTLISTED", estimatedValue: 2_400_000, estimatedCost: 620000, order: 1 },
        ],
      },
    },
    include: { recommendations: true },
  });

  await prisma.businessCase.create({
    data: {
      studyId: s2.id,
      executiveSummary: "R2.4M three-year value (ticket deflection + tool consolidation) against R1.4M TCO; 11-month payback.",
      currency: "USD", roiPct: 71, paybackMonths: 11, npv: 980000, irrPct: 58, discountRatePct: 10, horizonYears: 3,
      lccaNotes: "3-year TCO includes subscription, implementation and change management.",
      scenarios: {
        create: [
          { name: "Baseline (legacy ITSM + point tools)", isBaseline: true, order: 0 },
          { name: "Proposed (BMC Helix)", isBaseline: false, order: 1 },
        ],
      },
      costItems: {
        create: [
          { label: "Implementation & migration", kind: "ONE_OFF", amount: 380000, year: 0 },
          { label: "Change management & training", kind: "ONE_OFF", amount: 120000, year: 0 },
          { label: "Annual subscription", kind: "OPEX", amount: 300000, recurring: true },
          { label: "Ticket-handling & tool saving", kind: "BENEFIT", category: "COST_SAVING", amount: 520000, recurring: true },
          { label: "Avoided-downtime value", kind: "BENEFIT", category: "COST_SAVING", amount: 300000, recurring: true },
        ],
      },
    },
  });

  await prisma.kpiTarget.create({
    data: { kpiKey: "roi_pct", studyId: s2.id, baselineValue: 0, targetValue: 71, unit: "%", frequency: "once", dataSource: "Business case", ownerName: "Dana Okafor" },
  });

  // --- Standalone realization track: existing BMC Helix estate, no VE study ---
  // The customer already runs Helix — nothing to engineer — so the VRM starts a
  // realization track directly (origin STANDALONE, studyId null) and sets the
  // baselines in Phase 2 from the live deployment instead of inheriting them.
  console.log("→ Building standalone realization track (BMC Helix value assurance)…");
  const t2 = await prisma.realizationTrack.create({
    data: {
      code: "VR-2026-002",
      title: "BMC Helix Value Assurance — Meridian Bank",
      status: "IN_FLIGHT",
      health: "GREEN",
      organizationId: org.id,
      teamId: serviceTeam.id,
      industryKey: "serviceops",
      origin: "STANDALONE",
      studyId: null,
      ownerId: "u_vrm",
      objectives: "Prove and protect value on the existing BMC Helix estate — drive self-service deflection and cut MTTR to secure the renewal and grow the account.",
      successCriteria: "≥35% self-service deflection and MTTR under 3 hours, with the renewal defended on measured value.",
      plannedValue: 1_800_000,
      realizedValue: 540_000,
      currency: "USD",
      startedAt: new Date("2026-07-05"),
      targetDate: new Date("2026-12-20"),
      phases: {
        create: VR_PHASES.map((p) => ({
          phase: p.key as never,
          order: p.order,
          status: (p.order <= 3 ? "COMPLETE" : p.order === 4 ? "IN_PROGRESS" : "NOT_STARTED") as never,
        })),
      },
      workPackages: {
        create: [
          { name: "Baseline the live Helix estate (MTTR, deflection, tool spend)", status: "DONE", ownerId: "u_vrm", isMilestone: true, order: 1, startDate: new Date("2026-07-05"), dueDate: new Date("2026-07-25") },
          { name: "Tune AIOps event correlation to cut noise & MTTR", status: "DONE", ownerId: "u_vrm", order: 2, dueDate: new Date("2026-08-20") },
          { name: "Launch Digital Workplace self-service & virtual agent", status: "IN_PROGRESS", ownerId: "u_vrm", order: 3, dueDate: new Date("2026-10-15") },
          { name: "Consolidate remaining point monitoring tools", status: "NOT_STARTED", order: 4, isMilestone: true, dueDate: new Date("2026-12-10") },
        ],
      },
      benefits: {
        create: [
          { label: "Ticket-handling saving from deflection", category: "COST_SAVING", plannedValue: 1_000_000, realizedValue: 360000, firstMeasuredAt: new Date("2026-08-31") },
          { label: "Monitoring tool consolidation saving", category: "COST_SAVING", plannedValue: 800000, realizedValue: 180000, firstMeasuredAt: new Date("2026-09-15") },
        ],
      },
      risks: {
        create: [{ title: "Self-service adoption slower than planned", likelihood: 3, impact: 3, mitigation: "Champion network + targeted comms to shift demand to self-service.", status: "OPEN" }],
      },
      adoptionPlan: {
        create: {
          changeImpact: "Employees resolve more requests via self-service; ops shifts from manual triage to AIOps-assisted resolution.",
          trainingPlan: "Digital Workplace self-service onboarding; AIOps operator enablement.",
          commsPlan: "Launch campaign for the self-service portal; monthly value review with the customer.",
          championNetwork: "Service-desk lead + line-of-business champions.",
          activities: {
            create: [
              { label: "Self-service portal launch campaign", audience: "All employees", status: "IN_PROGRESS", order: 1 },
              { label: "AIOps operator enablement", audience: "Ops / NOC", status: "DONE", order: 2 },
            ],
          },
        },
      },
    },
  });

  await prisma.comment.create({ data: { authorId: "u_vrm", body: "Baseline is set from the live estate: MTTR 6.5h and 12% deflection. Renewal review is in Q4 — deflection ramp is the value story.", entityType: "RealizationTrack", entityId: t2.id, trackId: t2.id } });

  // KPI targets + actuals baselined from the live deployment (no study to inherit from)
  await prisma.kpiTarget.create({
    data: { kpiKey: "mttr", trackId: t2.id, baselineValue: 6.5, targetValue: 3.0, unit: "hours", frequency: "monthly", dataSource: "BMC Helix", ownerName: "Marco Ruiz",
      actuals: { create: [
        { periodLabel: "2026-07", periodDate: new Date("2026-07-31"), value: 6.2 },
        { periodLabel: "2026-08", periodDate: new Date("2026-08-31"), value: 5.1, note: "AIOps correlation cutting event noise." },
        { periodLabel: "2026-09", periodDate: new Date("2026-09-30"), value: 4.3 },
      ] },
    },
  });
  await prisma.kpiTarget.create({
    data: { kpiKey: "ticket_deflection", trackId: t2.id, baselineValue: 12, targetValue: 35, unit: "%", frequency: "monthly", dataSource: "BMC Helix", ownerName: "Marco Ruiz",
      actuals: { create: [
        { periodLabel: "2026-07", periodDate: new Date("2026-07-31"), value: 14 },
        { periodLabel: "2026-08", periodDate: new Date("2026-08-31"), value: 21 },
        { periodLabel: "2026-09", periodDate: new Date("2026-09-30"), value: 27, note: "Self-service and virtual agent ramping." },
      ] },
    },
  });

  // --- Demo Customer Success engagements (link the studies + tracks) ---------
  console.log("→ Building Customer Success engagements…");
  const csStages = (advancedTo: number) =>
    ({ create: CS_STAGES.map((s) => ({ stage: s.key as never, order: s.order, status: (s.order < advancedTo ? "COMPLETE" : s.order === advancedTo ? "IN_PROGRESS" : "NOT_STARTED") as never })) });

  const eng1 = await prisma.customerSuccessEngagement.create({
    data: {
      code: "CS-2026-001", accountName: "Retail Bank (Pty) Ltd", organizationId: org.id, teamId: automationTeam.id,
      industryKey: "automation", ownerId: "u_csm", status: "ACTIVE", healthOverall: "GREEN",
      arr: 3_200_000, currency: "USD", renewalDate: new Date("2026-12-15"),
      objectives: "Protect and grow value from the Control-M automation estate; secure renewal and expand into adjacent workloads.",
      startedAt: new Date("2026-06-20"), stages: csStages(6),
    },
  });
  await prisma.study.update({ where: { id: s1.id }, data: { engagementId: eng1.id } });
  await prisma.realizationTrack.update({ where: { id: t1.id }, data: { engagementId: eng1.id } });

  const eng2 = await prisma.customerSuccessEngagement.create({
    data: {
      code: "CS-2026-002", accountName: "Global Manufacturer", organizationId: org.id, teamId: serviceTeam.id,
      industryKey: "serviceops", ownerId: "u_csm", status: "AT_RISK", healthOverall: "AMBER",
      arr: 2_400_000, currency: "USD", renewalDate: new Date("2026-10-30"),
      objectives: "Prove Helix ITSM value and lift ticket deflection ahead of the renewal review.",
      startedAt: new Date("2026-07-05"), stages: csStages(5),
    },
  });
  await prisma.study.update({ where: { id: s2.id }, data: { engagementId: eng2.id } });
  await prisma.realizationTrack.update({ where: { id: t2.id }, data: { engagementId: eng2.id } });

  console.log("✓ Demo data ready.");
}

async function main() {
  await seedConfig();
  await seedDemo();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✓ Seed complete.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
