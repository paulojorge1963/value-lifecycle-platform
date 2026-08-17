"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { VE_PHASES, VR_PHASES } from "@/lib/domain/phases";
import { weightedScore, asCriteria, asScores, type Criterion } from "@/lib/evaluation";
import { isAiEnabled, generateJSON } from "@/lib/ai";

async function nextCode(prefix: string) {
  const year = new Date().getFullYear();
  const count =
    prefix === "VE"
      ? await prisma.study.count()
      : await prisma.realizationTrack.count();
  return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`;
}

async function audit(action: string, entityType: string, entityId: string, extra: { studyId?: string; trackId?: string; metadata?: object } = {}) {
  const user = await getCurrentUser();
  await prisma.auditEvent.create({
    data: { actorId: user?.id, action, entityType, entityId, studyId: extra.studyId, trackId: extra.trackId, metadata: extra.metadata },
  });
}

// ---- Create a new VE study -------------------------------------------------
export async function createStudy(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.create")) throw new Error("Not permitted");

  const title = String(formData.get("title") || "").trim();
  const industryKey = String(formData.get("industryKey") || "construction");
  const studyType = String(formData.get("studyType") || "") || null;
  const problemStatement = String(formData.get("problemStatement") || "") || null;
  const estimatedValue = formData.get("estimatedValue") ? Number(formData.get("estimatedValue")) : null;
  const currency = String(formData.get("currency") || "USD");
  if (!title) throw new Error("Title required");

  const code = await nextCode("VE");
  const study = await prisma.study.create({
    data: {
      code,
      title,
      status: "DRAFT",
      organizationId: user.organizationId,
      industryKey,
      ownerId: user.id,
      studyType,
      problemStatement,
      estimatedValue,
      currency,
      startedAt: new Date(),
      phases: {
        create: VE_PHASES.map((p) => ({ phase: p.key as never, order: p.order, status: "NOT_STARTED" as never })),
      },
    },
  });
  await audit("study.created", "Study", study.id, { studyId: study.id });
  revalidatePath("/ve");
  return study.id;
}

// ---- Archive / unarchive / delete a study ---------------------------------
export async function archiveStudy(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.study.update({ where: { id: studyId }, data: { status: "ARCHIVED" } });
  await audit("study.archived", "Study", studyId, { studyId });
  revalidatePath("/ve");
  revalidatePath(`/ve/${studyId}`);
}

export async function unarchiveStudy(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.study.update({ where: { id: studyId }, data: { status: "DRAFT" } });
  await audit("study.unarchived", "Study", studyId, { studyId });
  revalidatePath("/ve");
  revalidatePath(`/ve/${studyId}`);
}

export async function deleteStudy(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.delete")) throw new Error("Only an admin can delete a study");
  // Org-scope: never delete another organization's study.
  const study = await prisma.study.findFirst({ where: { id: studyId, organizationId: user.organizationId }, select: { id: true, code: true } });
  if (!study) throw new Error("Study not found");
  // Cascades all children; any realization track is detached (studyId → null) by the DB.
  await prisma.study.delete({ where: { id: study.id } });
  // Audit without a studyId FK — that row is gone now.
  await prisma.auditEvent.create({ data: { actorId: user.id, action: "study.deleted", entityType: "Study", entityId: study.id, metadata: { code: study.code } } });
  revalidatePath("/ve");
  revalidatePath("/portfolio");
}

// ---- Set a study phase status ---------------------------------------------
export async function setStudyPhaseStatus(studyId: string, phase: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.studyPhase.update({
    where: { studyId_phase: { studyId, phase: phase as never } },
    data: {
      status: status as never,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: status === "COMPLETE" ? new Date() : null,
    },
  });
  await audit("phase.updated", "StudyPhase", `${studyId}:${phase}`, { studyId, metadata: { phase, status } });
  revalidatePath(`/ve/${studyId}`);
}

// ---- Accept / reject a recommendation -------------------------------------
export async function setRecommendationStatus(recommendationId: string, studyId: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "recommendation.accept")) throw new Error("Only a Reviewer/Admin can change recommendation status");
  await prisma.recommendation.update({ where: { id: recommendationId }, data: { status: status as never } });
  await audit("recommendation.status", "Recommendation", recommendationId, { studyId, metadata: { status } });
  revalidatePath(`/ve/${studyId}`);
}

// ---- Function model inline editing -----------------------------------------
export async function addFunction(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const count = await prisma.functionItem.count({ where: { studyId } });
  const fn = await prisma.functionItem.create({
    data: { studyId, verb: "", noun: "", kind: "SECONDARY", order: count },
  });
  await audit("function.created", "FunctionItem", fn.id, { studyId });
  revalidatePath(`/ve/${studyId}`);
  return fn.id;
}

export async function updateFunction(
  id: string,
  studyId: string,
  data: { verb?: string; noun?: string; kind?: string; cost?: number | null; worth?: number | null; parentId?: string | null }
) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");

  // Guard the FAST chain against cycles: a function can't support itself or one
  // of its own descendants.
  if (data.parentId !== undefined && data.parentId) {
    if (data.parentId === id) throw new Error("A function cannot support itself.");
    const all = await prisma.functionItem.findMany({ where: { studyId }, select: { id: true, parentId: true } });
    const childrenOf = (pid: string) => all.filter((f) => f.parentId === pid).map((f) => f.id);
    const stack = [...childrenOf(id)];
    const seen = new Set<string>();
    while (stack.length) {
      const n = stack.pop()!;
      if (n === data.parentId) throw new Error("That would create a cycle in the FAST chain.");
      if (seen.has(n)) continue;
      seen.add(n);
      stack.push(...childrenOf(n));
    }
  }

  await prisma.functionItem.update({
    where: { id },
    data: {
      verb: data.verb,
      noun: data.noun,
      kind: data.kind as never,
      cost: data.cost,
      worth: data.worth,
      parentId: data.parentId === undefined ? undefined : data.parentId || null,
    },
  });
  revalidatePath(`/ve/${studyId}`);
}

export async function deleteFunction(id: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.functionItem.delete({ where: { id } });
  await audit("function.deleted", "FunctionItem", id, { studyId });
  revalidatePath(`/ve/${studyId}`);
}

// ---- Recommendation inline editing -----------------------------------------
export async function addRecommendation(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const count = await prisma.recommendation.count({ where: { studyId } });
  const rec = await prisma.recommendation.create({
    data: { studyId, title: "New recommendation", status: "PROPOSED", order: count },
  });
  await audit("recommendation.created", "Recommendation", rec.id, { studyId });
  revalidatePath(`/ve/${studyId}`);
  return rec.id;
}

export async function updateRecommendation(
  id: string,
  studyId: string,
  data: {
    title?: string;
    summary?: string | null;
    technicalDetail?: string | null;
    commercialDetail?: string | null;
    estimatedValue?: number | null;
    estimatedCost?: number | null;
  }
) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.recommendation.update({
    where: { id },
    data: {
      title: data.title,
      summary: data.summary,
      technicalDetail: data.technicalDetail,
      commercialDetail: data.commercialDetail,
      estimatedValue: data.estimatedValue,
      estimatedCost: data.estimatedCost,
    },
  });
  revalidatePath(`/ve/${studyId}`);
}

export async function deleteRecommendation(id: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  // Guard: an accepted recommendation already being implemented shouldn't vanish silently.
  const linked = await prisma.workPackage.count({ where: { recommendationId: id } });
  if (linked > 0) throw new Error("Cannot delete — linked to realization work packages.");
  await prisma.recommendation.delete({ where: { id } });
  await audit("recommendation.deleted", "Recommendation", id, { studyId });
  revalidatePath(`/ve/${studyId}`);
}

// ---- Alternative (Creative phase) inline editing ---------------------------
export async function addAlternative(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const alt = await prisma.alternative.create({
    data: { studyId, idea: "" },
  });
  await audit("alternative.created", "Alternative", alt.id, { studyId });
  revalidatePath(`/ve/${studyId}`);
  return alt.id;
}

export async function updateAlternative(
  id: string,
  studyId: string,
  data: { idea?: string; description?: string | null; functionId?: string | null; shortlisted?: boolean }
) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.alternative.update({
    where: { id },
    data: {
      idea: data.idea,
      description: data.description,
      functionId: data.functionId === undefined ? undefined : data.functionId || null,
      shortlisted: data.shortlisted,
    },
  });
  revalidatePath(`/ve/${studyId}`);
}

export async function deleteAlternative(id: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.alternative.delete({ where: { id } });
  await audit("alternative.deleted", "Alternative", id, { studyId });
  revalidatePath(`/ve/${studyId}`);
}

/**
 * Development phase: promote a (shortlisted) alternative into a developed
 * recommendation, seeding title/summary from the idea and linking the two so
 * the create → evaluate → develop chain stays connected.
 */
export async function promoteAlternative(altId: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const alt = await prisma.alternative.findUnique({ where: { id: altId } });
  if (!alt) throw new Error("Alternative not found");
  if (alt.recommendationId) throw new Error("Already promoted to a recommendation.");

  const count = await prisma.recommendation.count({ where: { studyId } });
  const rec = await prisma.recommendation.create({
    data: {
      studyId,
      title: alt.idea?.trim() || "Untitled recommendation",
      summary: alt.description ?? null,
      status: "PROPOSED",
      order: count,
    },
  });
  await prisma.alternative.update({ where: { id: altId }, data: { recommendationId: rec.id } });
  await audit("alternative.promoted", "Recommendation", rec.id, { studyId, metadata: { altId } });
  revalidatePath(`/ve/${studyId}`);
  return rec.id;
}

// ---- Evaluation matrix: criteria & scoring ---------------------------------
/**
 * Replace the study's evaluation criteria, then re-derive every alternative's
 * weighted score from its stored per-criterion scores so ranking stays correct.
 */
export async function updateEvaluationCriteria(studyId: string, criteria: Criterion[]) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const clean = asCriteria(criteria);
  await prisma.study.update({ where: { id: studyId }, data: { evaluationCriteria: clean as object } });

  // Recompute weighted scores for all alternatives against the new criteria.
  const alts = await prisma.alternative.findMany({ where: { studyId } });
  await Promise.all(
    alts.map((a) =>
      prisma.alternative.update({
        where: { id: a.id },
        data: { weightedScore: weightedScore(asScores(a.scores), clean) },
      })
    )
  );
  await audit("evaluation.criteria", "Study", studyId, { studyId, metadata: { count: clean.length } });
  revalidatePath(`/ve/${studyId}`);
}

/** Persist one alternative's scores and its (server-computed) weighted score. */
export async function saveAlternativeScores(
  altId: string,
  studyId: string,
  scores: Record<string, number>
) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const study = await prisma.study.findUnique({ where: { id: studyId }, select: { evaluationCriteria: true } });
  const criteria = asCriteria(study?.evaluationCriteria);
  const cleanScores = asScores(scores);
  await prisma.alternative.update({
    where: { id: altId },
    data: { scores: cleanScores, weightedScore: weightedScore(cleanScores, criteria) },
  });
  await audit("evaluation.scored", "Alternative", altId, { studyId });
  revalidatePath(`/ve/${studyId}`);
}

// ---- Business-case cost items inline editing -------------------------------
export async function addCostItem(businessCaseId: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const item = await prisma.costItem.create({
    data: { businessCaseId, label: "New line item", kind: "OPEX", amount: 0 },
  });
  await audit("costitem.created", "CostItem", item.id, { studyId });
  revalidatePath(`/ve/${studyId}/business-case`);
  return item.id;
}

export async function updateCostItem(
  id: string,
  studyId: string,
  data: { label?: string; kind?: string; category?: string | null; amount?: number; year?: number | null; recurring?: boolean }
) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.costItem.update({
    where: { id },
    data: {
      label: data.label,
      kind: data.kind,
      category: data.category === undefined ? undefined : (data.category as never) || null,
      amount: data.amount,
      year: data.year,
      recurring: data.recurring,
    },
  });
  revalidatePath(`/ve/${studyId}/business-case`);
}

export async function deleteCostItem(id: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  await prisma.costItem.delete({ where: { id } });
  await audit("costitem.deleted", "CostItem", id, { studyId });
  revalidatePath(`/ve/${studyId}/business-case`);
}

// ---- Currency selection ----------------------------------------------------
export async function updateBusinessCaseCurrency(businessCaseId: string, studyId: string, currency: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  // Keep the study headline currency in step with its business case.
  await prisma.businessCase.update({ where: { id: businessCaseId }, data: { currency } });
  await prisma.study.update({ where: { id: studyId }, data: { currency } });
  await audit("currency.updated", "BusinessCase", businessCaseId, { studyId, metadata: { currency } });
  revalidatePath(`/ve/${studyId}/business-case`);
  revalidatePath(`/ve/${studyId}`);
}

// ---- The marquee flow: hand a study over into a Value Realization track ----
export async function handoverToRealization(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "track.create")) throw new Error("Not permitted");

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: { businessCase: true, handover: true, recommendations: true, kpiTargets: true },
  });
  if (!study) throw new Error("Study not found");

  // Guard: require accepted recommendations + at least one handover artifact.
  const accepted = study.recommendations.filter((r) => r.status === "ACCEPTED");
  if (accepted.length === 0) throw new Error("No accepted recommendations to hand over");

  const code = await nextCode("VR");
  const track = await prisma.realizationTrack.create({
    data: {
      code,
      title: `${study.title} — Realization`,
      status: "PLANNING",
      health: "GREEN",
      organizationId: study.organizationId,
      teamId: study.teamId,
      industryKey: study.industryKey,
      studyId: study.id,
      ownerId: user.id,
      objectives: study.businessCase?.executiveSummary ?? `Implement approved recommendations from ${study.code}.`,
      successCriteria: study.handover.find((h) => h.type === "SUCCESS_CRITERION")?.detail ?? null,
      plannedValue: study.estimatedValue,
      currency: study.currency,
      startedAt: new Date(),
      phases: {
        create: VR_PHASES.map((p) => ({ phase: p.key as never, order: p.order, status: "NOT_STARTED" as never })),
      },
      // Seed work packages from accepted recommendations
      workPackages: {
        create: accepted.map((r, i) => ({
          name: `Implement: ${r.title}`,
          description: r.summary,
          status: "NOT_STARTED" as never,
          order: i + 1,
          recommendationId: r.id,
        })),
      },
      // Seed benefits from expected-benefit handover artifacts
      benefits: {
        create: study.handover
          .filter((h) => h.type === "EXPECTED_BENEFIT")
          .map((h) => {
            const d = (h.data as { plannedValue?: number; category?: string }) ?? {};
            return {
              label: h.title,
              category: (d.category as never) ?? ("COST_SAVING" as never),
              plannedValue: d.plannedValue ?? 0,
              realizedValue: 0,
              currency: study.currency,
            };
          }),
      },
      adoptionPlan: { create: {} },
    },
  });

  // Link handover artifacts to the new track (keeps both sides connected)
  await prisma.handoverArtifact.updateMany({ where: { studyId: study.id }, data: { trackId: track.id } });

  // Copy KPI handover artifacts into KpiTargets on the track
  const kpiArtifacts = study.handover.filter((h) => h.type === "KPI");
  for (const h of kpiArtifacts) {
    const d = (h.data as { kpiKey?: string; baselineValue?: number; targetValue?: number; unit?: string; frequency?: string; dataSource?: string; owner?: string }) ?? {};
    if (!d.kpiKey) continue;
    const exists = await prisma.kpiDefinition.findUnique({ where: { key: d.kpiKey } });
    if (!exists) continue;
    await prisma.kpiTarget.create({
      data: {
        kpiKey: d.kpiKey,
        trackId: track.id,
        baselineValue: d.baselineValue ?? null,
        targetValue: d.targetValue ?? null,
        unit: d.unit ?? "USD",
        frequency: d.frequency ?? null,
        dataSource: d.dataSource ?? null,
        ownerName: d.owner ?? null,
      },
    });
  }

  await prisma.study.update({ where: { id: study.id }, data: { status: "HANDED_OVER" } });
  await audit("handover.created", "RealizationTrack", track.id, { studyId: study.id, trackId: track.id });

  revalidatePath(`/ve/${studyId}`);
  revalidatePath("/vr");
  return track.id;
}

// ---- Start a standalone realization track (VRM-only, no VE study) -----------
// For software already in place at a customer where no Value Engineering is
// needed — you just want to run the realization lifecycle to protect and prove
// value. The track starts blank (7 VR phases + an adoption plan); benefits and
// KPI targets are added from the existing deployment's baseline.
export async function createRealizationTrack(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "track.create")) throw new Error("Not permitted");

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title required");
  const industryKey = String(formData.get("industryKey") || "automation");
  const objectives = String(formData.get("objectives") || "") || null;
  const successCriteria = String(formData.get("successCriteria") || "") || null;
  const plannedValue = formData.get("plannedValue") ? Number(formData.get("plannedValue")) : null;
  const currency = String(formData.get("currency") || "USD");
  const targetDateRaw = String(formData.get("targetDate") || "");
  const targetDate = targetDateRaw ? new Date(targetDateRaw) : null;

  const code = await nextCode("VR");
  const track = await prisma.realizationTrack.create({
    data: {
      code,
      title,
      status: "PLANNING",
      health: "GREEN",
      origin: "STANDALONE",
      organizationId: user.organizationId,
      industryKey,
      studyId: null,
      ownerId: user.id,
      objectives,
      successCriteria,
      plannedValue,
      currency,
      startedAt: new Date(),
      targetDate,
      phases: {
        create: VR_PHASES.map((p) => ({ phase: p.key as never, order: p.order, status: "NOT_STARTED" as never })),
      },
      adoptionPlan: { create: {} },
    },
  });

  await audit("track.created", "RealizationTrack", track.id, { trackId: track.id, metadata: { origin: "STANDALONE" } });
  revalidatePath("/vr");
  return track.id;
}

// ---- Set a VR phase status -------------------------------------------------
export async function setTrackPhaseStatus(trackId: string, phase: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "track.edit")) throw new Error("Not permitted");
  await prisma.vrPhaseInstance.update({
    where: { trackId_phase: { trackId, phase: phase as never } },
    data: {
      status: status as never,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: status === "COMPLETE" ? new Date() : null,
    },
  });
  await audit("vrphase.updated", "VrPhaseInstance", `${trackId}:${phase}`, { trackId, metadata: { phase, status } });
  revalidatePath(`/vr/${trackId}`);
}

// ---- Update work package status --------------------------------------------
export async function setWorkPackageStatus(workPackageId: string, trackId: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "track.edit")) throw new Error("Not permitted");
  await prisma.workPackage.update({ where: { id: workPackageId }, data: { status: status as never } });
  revalidatePath(`/vr/${trackId}`);
}

// ---- Record a KPI actual + roll up realized value --------------------------
export async function recordKpiActual(trackId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "kpi.record")) throw new Error("Not permitted");
  const kpiTargetId = String(formData.get("kpiTargetId"));
  const periodLabel = String(formData.get("periodLabel"));
  const value = Number(formData.get("value"));
  if (!kpiTargetId || !periodLabel || Number.isNaN(value)) throw new Error("Missing fields");

  await prisma.kpiActual.upsert({
    where: { kpiTargetId_periodLabel: { kpiTargetId, periodLabel } },
    create: { kpiTargetId, periodLabel, periodDate: new Date(), value },
    update: { value },
  });
  await audit("kpi.actual", "KpiActual", kpiTargetId, { trackId, metadata: { periodLabel, value } });
  revalidatePath(`/vr/${trackId}`);
}

// ---- Update realized benefit value + roll up to track ----------------------
export async function updateBenefitRealized(benefitId: string, trackId: string, realizedValue: number) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "kpi.record")) throw new Error("Not permitted");
  await prisma.benefit.update({
    where: { id: benefitId },
    data: { realizedValue, firstMeasuredAt: realizedValue > 0 ? new Date() : null },
  });
  const benefits = await prisma.benefit.findMany({ where: { trackId } });
  const total = benefits.reduce((s, b) => s + b.realizedValue, 0);
  await prisma.realizationTrack.update({ where: { id: trackId }, data: { realizedValue: total } });
  revalidatePath(`/vr/${trackId}`);
}

// ---- Comments (discussion) -------------------------------------------------
export async function addComment(input: {
  entityType: string;
  entityId: string;
  body: string;
  studyId?: string | null;
  trackId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not permitted");
  const body = input.body.trim();
  if (!body) throw new Error("Comment is empty");
  await prisma.comment.create({
    data: {
      authorId: user.id,
      body,
      entityType: input.entityType,
      entityId: input.entityId,
      studyId: input.studyId ?? null,
      trackId: input.trackId ?? null,
    },
  });
  if (input.studyId) revalidatePath(`/ve/${input.studyId}`);
  if (input.trackId) revalidatePath(`/vr/${input.trackId}`);
}

export async function deleteComment(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not permitted");
  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c) return;
  if (c.authorId !== user.id && user.role !== "ADMIN") throw new Error("You can only delete your own comments.");
  await prisma.comment.delete({ where: { id } });
  if (c.studyId) revalidatePath(`/ve/${c.studyId}`);
  if (c.trackId) revalidatePath(`/vr/${c.trackId}`);
}

// ---- Version history (business case documents) -----------------------------
export async function saveBusinessCaseVersion(studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const bc = await prisma.businessCase.findUnique({
    where: { studyId },
    include: { scenarios: { orderBy: { order: "asc" } }, costItems: true },
  });
  if (!bc) throw new Error("No business case to version");
  const last = await prisma.documentVersion.findFirst({
    where: { entityType: "BusinessCase", entityId: bc.id },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const snapshot = {
    executiveSummary: bc.executiveSummary,
    currency: bc.currency,
    roiPct: bc.roiPct,
    paybackMonths: bc.paybackMonths,
    npv: bc.npv,
    irrPct: bc.irrPct,
    discountRatePct: bc.discountRatePct,
    horizonYears: bc.horizonYears,
    lccaNotes: bc.lccaNotes,
    riskNarrative: bc.riskNarrative,
    scenarios: bc.scenarios.map((s) => ({ name: s.name, isBaseline: s.isBaseline, description: s.description, order: s.order })),
    costItems: bc.costItems.map((c) => ({ label: c.label, kind: c.kind, category: c.category, amount: c.amount, year: c.year, recurring: c.recurring })),
  };
  await prisma.documentVersion.create({
    data: { entityType: "BusinessCase", entityId: bc.id, version, authorId: user.id, studyId, snapshot: snapshot as object },
  });
  await audit("version.saved", "BusinessCase", bc.id, { studyId, metadata: { version } });
  revalidatePath(`/ve/${studyId}/business-case`);
  return version;
}

export async function restoreBusinessCaseVersion(versionId: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");
  const dv = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!dv) throw new Error("Version not found");
  const snap = dv.snapshot as {
    executiveSummary?: string | null; currency?: string; roiPct?: number | null; paybackMonths?: number | null;
    npv?: number | null; irrPct?: number | null; discountRatePct?: number | null; horizonYears?: number | null;
    lccaNotes?: string | null; riskNarrative?: string | null;
    scenarios?: { name: string; isBaseline: boolean; description: string | null; order: number }[];
    costItems?: { label: string; kind: string; category: string | null; amount: number; year: number | null; recurring: boolean }[];
  };

  await prisma.businessCase.update({
    where: { id: dv.entityId },
    data: {
      executiveSummary: snap.executiveSummary ?? null,
      currency: snap.currency ?? "USD",
      roiPct: snap.roiPct ?? null,
      paybackMonths: snap.paybackMonths ?? null,
      npv: snap.npv ?? null,
      irrPct: snap.irrPct ?? null,
      discountRatePct: snap.discountRatePct ?? null,
      horizonYears: snap.horizonYears ?? null,
      lccaNotes: snap.lccaNotes ?? null,
      riskNarrative: snap.riskNarrative ?? null,
    },
  });
  // Replace scenarios & cost items with the snapshot's.
  await prisma.scenario.deleteMany({ where: { businessCaseId: dv.entityId } });
  await prisma.costItem.deleteMany({ where: { businessCaseId: dv.entityId } });
  for (const s of snap.scenarios ?? []) {
    await prisma.scenario.create({ data: { businessCaseId: dv.entityId, name: s.name, isBaseline: s.isBaseline, description: s.description, order: s.order } });
  }
  for (const c of snap.costItems ?? []) {
    await prisma.costItem.create({ data: { businessCaseId: dv.entityId, label: c.label, kind: c.kind, category: (c.category as never) ?? null, amount: c.amount, year: c.year, recurring: c.recurring } });
  }
  await audit("version.restored", "BusinessCase", dv.entityId, { studyId, metadata: { version: dv.version } });
  revalidatePath(`/ve/${studyId}/business-case`);
  revalidatePath(`/ve/${studyId}`);
}

// ---- AI starter-text generation --------------------------------------------
type IndustryConfig = { valueLevers?: string[]; costDrivers?: string[] };

/**
 * Draft a recommendation's summary + technical + commercial detail from study
 * context. Uses Claude when ANTHROPIC_API_KEY is set; otherwise returns
 * template starter text seeded from the industry profile's value levers.
 */
export async function draftRecommendation(
  recId: string,
  studyId: string,
  titleHint?: string
): Promise<{ summary: string; technicalDetail: string; commercialDetail: string; source: "ai" | "template" }> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");

  const rec = await prisma.recommendation.findUnique({ where: { id: recId } });
  const study = await prisma.study.findUnique({ where: { id: studyId }, include: { industry: true } });
  if (!rec || !study) throw new Error("Not found");
  const title = (titleHint || rec.title || "").trim() || "the proposed recommendation";
  const cfg = (study.industry.config as IndustryConfig) ?? {};

  if (isAiEnabled()) {
    try {
      const out = await generateJSON<{ summary: string; technicalDetail: string; commercialDetail: string }>({
        system:
          "You are a value engineer drafting concise, professional starter text for a value-engineering study deliverable. Keep each field to 1–3 sentences, specific and free of filler. This is an editable draft the engineer will refine.",
        prompt:
          `Study: ${study.title}\n` +
          `Industry: ${study.industry.name}\n` +
          (study.problemStatement ? `Problem: ${study.problemStatement}\n` : "") +
          `Recommendation title: ${title}\n\n` +
          "Draft: (1) a one-line summary, (2) technical detail (the solution approach), and (3) commercial detail (cost/benefit rationale).",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            technicalDetail: { type: "string" },
            commercialDetail: { type: "string" },
          },
          required: ["summary", "technicalDetail", "commercialDetail"],
        },
      });
      return { ...out, source: "ai" };
    } catch {
      // fall through to template
    }
  }

  const lever = cfg.valueLevers?.[0] ?? "process improvement";
  const driver = cfg.costDrivers?.[0] ?? "total cost";
  return {
    summary: `Implement "${title}" to improve value in ${study.industry.name.toLowerCase()} without compromising required performance.`,
    technicalDetail: `Apply ${lever.toLowerCase()} to deliver the required functions with a simpler, lower-cost solution. Confirm performance against the baseline before rollout.`,
    commercialDetail: `Targets a reduction in ${driver.toLowerCase()} vs the baseline; quantify CAPEX/OPEX impact and payback in the business case.`,
    source: "template",
  };
}

/**
 * Generate several creative alternatives for a study (optionally for one
 * function) and persist them. AI when available; otherwise seeds ideas from the
 * industry profile's value levers.
 */
export async function brainstormAlternatives(
  studyId: string,
  functionId?: string | null
): Promise<{ created: number; source: "ai" | "template" }> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.edit")) throw new Error("Not permitted");

  const study = await prisma.study.findUnique({ where: { id: studyId }, include: { industry: true } });
  if (!study) throw new Error("Study not found");
  const fn = functionId ? await prisma.functionItem.findUnique({ where: { id: functionId } }) : null;
  const fnLabel = fn ? `${fn.verb} ${fn.noun}`.trim() : null;
  const cfg = (study.industry.config as IndustryConfig) ?? {};

  let ideas: { idea: string; description: string }[] = [];
  let source: "ai" | "template" = "template";

  if (isAiEnabled()) {
    try {
      const out = await generateJSON<{ ideas: { idea: string; description: string }[] }>({
        system:
          "You are a value engineer running the Creative (Speculation) phase. Generate diverse, practical alternative ways to deliver the function or improve value. Defer judgement — favour quantity and variety. Each idea is a short verb-led phrase with a one-line description.",
        prompt:
          `Study: ${study.title}\n` +
          `Industry: ${study.industry.name}\n` +
          (study.problemStatement ? `Problem: ${study.problemStatement}\n` : "") +
          (fnLabel ? `Focus function: ${fnLabel}\n` : "") +
          "\nGenerate 5 distinct creative alternatives.",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ideas: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: { idea: { type: "string" }, description: { type: "string" } },
                required: ["idea", "description"],
              },
            },
          },
          required: ["ideas"],
        },
        maxTokens: 2048,
      });
      ideas = (out.ideas ?? []).slice(0, 6);
      source = "ai";
    } catch {
      /* fall through to template */
    }
  }

  if (ideas.length === 0) {
    const levers = cfg.valueLevers?.length ? cfg.valueLevers : ["Simplify the design", "Substitute materials", "Automate the process"];
    ideas = levers.slice(0, 5).map((l) => ({
      idea: fnLabel ? `${l} — for "${fnLabel}"` : l,
      description: `Explore ${l.toLowerCase()} as a way to deliver the required function at lower cost.`,
    }));
  }

  for (const i of ideas) {
    await prisma.alternative.create({
      data: { studyId, idea: i.idea.slice(0, 200), description: i.description, functionId: functionId ?? null },
    });
  }
  await audit("alternatives.brainstormed", "Study", studyId, { studyId, metadata: { count: ideas.length, source } });
  revalidatePath(`/ve/${studyId}`);
  return { created: ideas.length, source };
}
