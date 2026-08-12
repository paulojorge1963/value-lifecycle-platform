/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { INDUSTRY_PROFILES } from "../src/lib/domain/industries";
import { VE_PHASES, VR_PHASES } from "../src/lib/domain/phases";
import { KPI_CATALOG } from "../src/lib/domain/kpis";
import { CONTENT_TEMPLATES } from "../src/lib/domain/templates";
import { DEFAULT_CRITERIA, weightedScore } from "../src/lib/evaluation";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "demo1234";

async function seedConfig() {
  console.log("→ Seeding industry profiles…");
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

  const capital = await prisma.team.upsert({
    where: { id: "team_capital" },
    create: { id: "team_capital", name: "Capital Projects", organizationId: org.id },
    update: {},
  });
  const digital = await prisma.team.upsert({
    where: { id: "team_digital" },
    create: { id: "team_digital", name: "Digital & SaaS", organizationId: org.id },
    update: {},
  });

  const users = [
    { id: "u_ve", email: "ve@demo.app", name: "Dana Okafor", title: "Value Engineer", role: "VALUE_ENGINEER" },
    { id: "u_vrm", email: "vrm@demo.app", name: "Marco Ruiz", title: "Value Realization Manager", role: "VALUE_REALIZATION_MANAGER" },
    { id: "u_rev", email: "reviewer@demo.app", name: "Priya Nair", title: "Portfolio Reviewer", role: "REVIEWER" },
    { id: "u_view", email: "viewer@demo.app", name: "Sam Lee", title: "Stakeholder", role: "VIEWER" },
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
  console.log("→ Resetting demo studies & tracks…");
  await prisma.realizationTrack.deleteMany({ where: { organizationId: org.id } });
  await prisma.study.deleteMany({ where: { organizationId: org.id } });

  // --- Demo study 1: Construction (fully handed over → has a live VR track) ---
  console.log("→ Building demo study 1 (construction)…");
  const s1 = await prisma.study.create({
    data: {
      code: "VE-2026-014",
      title: "Wastewater Plant — Clarifier Structure VE",
      summary: "Design VE study on the secondary clarifier structures to reduce cost and whole-life cost without compromising treatment performance.",
      status: "HANDED_OVER",
      organizationId: org.id,
      teamId: capital.id,
      industryKey: "construction",
      ownerId: "u_ve",
      studyType: "Design VE study",
      problemStatement: "Clarifier structures represent 18% of civil cost with a conservative reference design. Opportunity to simplify without affecting hydraulic performance.",
      scope: "In: clarifier civil structures, mechanisms. Out: electrical, controls.",
      estimatedValue: 1_250_000,
      currency: "ZAR",
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
          { verb: "Separate", noun: "solids", kind: "BASIC", cost: 420000, worth: 300000, order: 1 },
          { verb: "Contain", noun: "flow", kind: "BASIC", cost: 260000, worth: 220000, order: 2 },
          { verb: "Resist", noun: "uplift", kind: "SECONDARY", cost: 180000, worth: 90000, order: 3 },
          { verb: "Support", noun: "mechanism", kind: "SECONDARY", cost: 140000, worth: 110000, order: 4 },
        ],
      },
      recommendations: {
        create: [
          { title: "Standardise wall thickness & simplify formwork", summary: "Adopt a single wall thickness with re-usable formwork.", technicalDetail: "Move from 3 wall sections to 1; re-usable modular formwork.", commercialDetail: "Cuts formwork labour and material waste.", status: "ACCEPTED", estimatedValue: 780000, estimatedCost: 60000, order: 1 },
          { title: "Ground-anchor uplift solution", summary: "Replace mass concrete with ground anchors to resist uplift.", technicalDetail: "Post-tensioned ground anchors vs mass concrete base.", commercialDetail: "Reduces concrete volume and excavation.", status: "ACCEPTED", estimatedValue: 470000, estimatedCost: 90000, order: 2 },
        ],
      },
      risks: {
        create: [
          { title: "Anchor performance in variable ground", likelihood: 3, impact: 4, mitigation: "Trial anchors + pull tests before rollout.", status: "MITIGATING" },
        ],
      },
    },
    include: { recommendations: true, functions: true },
  });

  // Creative alternatives + evaluation scores for study 1 (populates the matrix).
  const fnBy = (verb: string) => s1.functions.find((f) => f.verb === verb)?.id ?? null;

  // FAST how/why chain: Separate solids → Contain flow → (Resist uplift, Support mechanism)
  const fastLinks: [string, string | null][] = [
    ["Separate", null],
    ["Contain", fnBy("Separate")],
    ["Resist", fnBy("Contain")],
    ["Support", fnBy("Contain")],
  ];
  for (const [verb, parentId] of fastLinks) {
    const id = fnBy(verb);
    if (id) await prisma.functionItem.update({ where: { id }, data: { parentId } });
  }

  const seededAlts = [
    { idea: "Standardised single wall thickness + modular formwork", functionId: fnBy("Separate"), scores: { cost: 5, performance: 4, risk: 3, feasibility: 4, schedule: 4 }, shortlisted: true },
    { idea: "Post-tensioned ground anchors for uplift", functionId: fnBy("Resist"), scores: { cost: 4, performance: 4, risk: 2, feasibility: 3, schedule: 3 }, shortlisted: true },
    { idea: "Precast clarifier base panels", functionId: fnBy("Contain"), scores: { cost: 3, performance: 4, risk: 3, feasibility: 3, schedule: 5 }, shortlisted: false },
    { idea: "Thicken mass-concrete base (do-minimum)", functionId: fnBy("Resist"), scores: { cost: 2, performance: 5, risk: 4, feasibility: 5, schedule: 2 }, shortlisted: false },
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
      executiveSummary: "Two accepted recommendations deliver ~R1.25M capital saving with a 4-month payback and strong whole-life benefit.",
      currency: "ZAR",
      roiPct: 733,
      paybackMonths: 4,
      npv: 1_050_000,
      irrPct: 210,
      discountRatePct: 8,
      horizonYears: 20,
      lccaNotes: "Reduced concrete volume lowers maintenance and carbon over 20-year horizon.",
      riskNarrative: "Primary risk is anchor performance; mitigated with a trial-anchor programme.",
      scenarios: {
        create: [
          { name: "Baseline (reference design)", isBaseline: true, order: 0, description: "Conservative reference clarifier design." },
          { name: "Proposed (VE optimised)", isBaseline: false, order: 1, description: "Standardised walls + ground-anchor uplift." },
        ],
      },
      costItems: {
        create: [
          { label: "VE design rework", kind: "ONE_OFF", amount: 150000, year: 0 },
          { label: "Trial anchor programme", kind: "ONE_OFF", amount: 40000, year: 0 },
          { label: "Capital saving (formwork + concrete)", kind: "BENEFIT", category: "COST_SAVING", amount: 1_250_000, year: 0 },
          { label: "Annual maintenance saving", kind: "BENEFIT", category: "COST_SAVING", amount: 45000, recurring: true },
        ],
      },
    },
  });

  // Handover artifacts for study 1
  const handoverData = [
    { type: "EXPECTED_BENEFIT", title: "Capital cost saving", detail: "R1.25M reduction in clarifier civil cost", data: { plannedValue: 1250000, category: "COST_SAVING" }, order: 0 },
    { type: "KPI", title: "Life-cycle cost reduction", detail: "Whole-life cost vs baseline", data: { kpiKey: "lcc_reduction", baselineValue: 0, targetValue: 900000, unit: "ZAR", frequency: "quarterly", dataSource: "Cost model", owner: "Marco Ruiz" }, order: 1 },
    { type: "KPI", title: "Reliability / uptime", detail: "Plant availability maintained", data: { kpiKey: "reliability_uptime", baselineValue: 98.5, targetValue: 98.5, unit: "%", frequency: "monthly", dataSource: "SCADA", owner: "Ops" }, order: 2 },
    { type: "BASELINE", title: "Baseline civil cost", detail: "R6.9M reference design civil cost", data: { value: 6900000 }, order: 3 },
    { type: "SUCCESS_CRITERION", title: "No performance compromise", detail: "Hydraulic & treatment performance ≥ baseline", order: 4 },
    { type: "RISK", title: "Anchor performance", detail: "Variable ground conditions", order: 5 },
  ];
  for (const h of handoverData) {
    await prisma.handoverArtifact.create({
      data: { studyId: s1.id, type: h.type, title: h.title, detail: h.detail, data: (h as any).data ?? undefined, order: h.order, recommendationId: s1.recommendations[0]?.id },
    });
  }

  // KPI targets on the study (VE planned)
  await prisma.kpiTarget.create({
    data: { kpiKey: "cost_savings", studyId: s1.id, baselineValue: 6900000, targetValue: 1250000, unit: "ZAR", frequency: "once", dataSource: "Cost model", ownerName: "Dana Okafor" },
  });

  // Discussion on study 1
  await prisma.comment.create({ data: { authorId: "u_rev", body: "Strong case. Please confirm the trial-anchor pull-test results feed the risk log before we approve.", entityType: "Study", entityId: s1.id, studyId: s1.id } });
  await prisma.comment.create({ data: { authorId: "u_ve", body: "Trial anchors are scheduled — I'll attach the pull-test data in the Development phase and update the risk register.", entityType: "Study", entityId: s1.id, studyId: s1.id } });

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
      title: "Clarifier VE — Realization",
      status: "IN_FLIGHT",
      health: "GREEN",
      organizationId: org.id,
      teamId: capital.id,
      industryKey: "construction",
      studyId: s1.id,
      ownerId: "u_vrm",
      objectives: "Implement the two accepted recommendations and prove the R1.25M capital saving and whole-life benefit.",
      successCriteria: "≥R1.1M realized capital saving with no performance compromise.",
      plannedValue: 1_250_000,
      realizedValue: 690_000,
      currency: "ZAR",
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
          { name: "Re-issue clarifier design package", status: "DONE", ownerId: "u_vrm", isMilestone: true, order: 1, startDate: new Date("2026-06-25"), dueDate: new Date("2026-07-30"), recommendationId: s1.recommendations[0]?.id },
          { name: "Trial anchor programme", status: "DONE", ownerId: "u_vrm", order: 2, dueDate: new Date("2026-08-20"), recommendationId: s1.recommendations[1]?.id },
          { name: "Procure modular formwork", status: "IN_PROGRESS", ownerId: "u_vrm", order: 3, dueDate: new Date("2026-09-30") },
          { name: "Construct optimised clarifiers", status: "NOT_STARTED", order: 4, isMilestone: true, dueDate: new Date("2026-12-01") },
        ],
      },
      benefits: {
        create: [
          { label: "Formwork & concrete capital saving", category: "COST_SAVING", plannedValue: 780000, realizedValue: 520000, firstMeasuredAt: new Date("2026-08-10") },
          { label: "Ground-anchor uplift saving", category: "COST_SAVING", plannedValue: 470000, realizedValue: 170000, firstMeasuredAt: new Date("2026-09-05") },
        ],
      },
      risks: {
        create: [{ title: "Ground variability at north basin", likelihood: 2, impact: 3, mitigation: "Additional pull tests scheduled.", status: "OPEN" }],
      },
      adoptionPlan: {
        create: {
          changeImpact: "Site team adopts modular formwork method; QA updates inspection checklists.",
          trainingPlan: "Formwork method toolbox talks; anchor QA training.",
          commsPlan: "Weekly site briefing; monthly steering update.",
          championNetwork: "Site engineer + QA lead as method champions.",
          activities: {
            create: [
              { label: "Formwork method toolbox talk", audience: "Site crew", status: "DONE", order: 1 },
              { label: "Anchor QA training", audience: "QA team", status: "IN_PROGRESS", order: 2 },
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
  await prisma.comment.create({ data: { authorId: "u_vrm", body: "Formwork procurement is the critical path this month — chasing the supplier for a firm date.", entityType: "RealizationTrack", entityId: t1.id, trackId: t1.id } });

  // KPI targets + actuals on the track (VR realized)
  const lccTarget = await prisma.kpiTarget.create({
    data: { kpiKey: "lcc_reduction", trackId: t1.id, baselineValue: 0, targetValue: 900000, unit: "ZAR", frequency: "quarterly", dataSource: "Cost model", ownerName: "Marco Ruiz",
      actuals: { create: [
        { periodLabel: "2026-Q3", periodDate: new Date("2026-09-30"), value: 690000, note: "Formwork + partial anchor savings realized." },
      ] },
    },
  });
  await prisma.kpiTarget.create({
    data: { kpiKey: "on_time_implementation", trackId: t1.id, baselineValue: 0, targetValue: 90, unit: "%", frequency: "monthly", dataSource: "Schedule", ownerName: "Marco Ruiz",
      actuals: { create: [
        { periodLabel: "2026-07", periodDate: new Date("2026-07-31"), value: 100 },
        { periodLabel: "2026-08", periodDate: new Date("2026-08-31"), value: 95 },
        { periodLabel: "2026-09", periodDate: new Date("2026-09-30"), value: 88 },
      ] },
    },
  });

  await prisma.valueReport.create({
    data: {
      trackId: t1.id, kind: "QUARTERLY_QBR", title: "Q3 2026 QBR — Clarifier VE",
      periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-09-30"),
      content: {
        executiveStory: "On track: R690K of R1.25M realized by end of Q3 with no performance compromise.",
        progress: "3 of 4 work packages complete or in progress; construction milestone next.",
        realizedToDate: 690000,
        nextBestActions: ["Complete formwork procurement", "Begin optimised construction"],
        expansion: "Apply standardised formwork approach to two further basins.",
      },
    },
  });

  // --- Demo study 2: SaaS (in-progress, not yet handed over) ---
  console.log("→ Building demo study 2 (SaaS)…");
  const s2 = await prisma.study.create({
    data: {
      code: "VE-2026-021",
      title: "Field Service Platform — ROI / TCO Business Case",
      summary: "Value engineering the move from manual dispatch to an integrated field-service SaaS platform.",
      status: "IN_REVIEW",
      organizationId: org.id,
      teamId: digital.id,
      industryKey: "saas",
      ownerId: "u_ve",
      studyType: "ROI / TCO business case",
      problemStatement: "Manual dispatch and paper job cards drive high admin cost, low first-time-fix and slow invoicing.",
      scope: "In: dispatch, mobile job execution, invoicing. Out: HR, payroll.",
      estimatedValue: 2_400_000,
      currency: "ZAR",
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
          { title: "Deploy integrated field-service SaaS", summary: "Replace manual dispatch with SaaS + mobile app.", technicalDetail: "Cloud platform, mobile app, ERP integration.", commercialDetail: "Subscription + implementation vs manual labour + legacy TCO.", status: "SHORTLISTED", estimatedValue: 2_400_000, estimatedCost: 620000, order: 1 },
        ],
      },
    },
    include: { recommendations: true },
  });

  await prisma.businessCase.create({
    data: {
      studyId: s2.id,
      executiveSummary: "R2.4M three-year value (process automation + revenue uplift) against R1.4M TCO; 11-month payback.",
      currency: "ZAR", roiPct: 71, paybackMonths: 11, npv: 980000, irrPct: 58, discountRatePct: 10, horizonYears: 3,
      lccaNotes: "3-year TCO includes subscription, implementation and change management.",
      scenarios: {
        create: [
          { name: "Baseline (manual dispatch)", isBaseline: true, order: 0 },
          { name: "Proposed (SaaS platform)", isBaseline: false, order: 1 },
        ],
      },
      costItems: {
        create: [
          { label: "Implementation & integration", kind: "ONE_OFF", amount: 380000, year: 0 },
          { label: "Change management & training", kind: "ONE_OFF", amount: 120000, year: 0 },
          { label: "Annual subscription", kind: "OPEX", amount: 300000, recurring: true },
          { label: "Admin labour saving", kind: "BENEFIT", category: "COST_SAVING", amount: 520000, recurring: true },
          { label: "First-time-fix revenue uplift", kind: "BENEFIT", category: "REVENUE_UPLIFT", amount: 300000, recurring: true },
        ],
      },
    },
  });

  await prisma.kpiTarget.create({
    data: { kpiKey: "roi_pct", studyId: s2.id, baselineValue: 0, targetValue: 71, unit: "%", frequency: "once", dataSource: "Business case", ownerName: "Dana Okafor" },
  });

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
