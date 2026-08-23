"use server";

// =============================================================================
//  Customer Success — server actions (Phase-1 MVP).
//  A CS engagement is per-account and continuous; it references the account's
//  VE studies and VR tracks rather than copying them.
// =============================================================================

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { CS_STAGES } from "@/lib/domain/cs-stages";
import { HEALTH_FACTORS, overallScore, ragFor } from "@/lib/domain/cs-health";
import { isAiEnabled, generateJSON } from "@/lib/ai";
import { fmtMoney, fmtPct } from "@/lib/finance";

async function audit(action: string, entityId: string, metadata?: object) {
  const user = await getCurrentUser();
  await prisma.auditEvent.create({
    data: { actorId: user?.id, action, entityType: "CustomerSuccessEngagement", entityId, metadata },
  });
}

async function nextCode(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.customerSuccessEngagement.count();
  return `CS-${year}-${String(n + 1).padStart(3, "0")}`;
}

export async function createEngagement(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.create")) throw new Error("Not permitted");

  const accountName = String(formData.get("accountName") || "").trim();
  if (!accountName) throw new Error("Account name required");
  const industryKey = String(formData.get("industryKey") || "automation");
  const currency = String(formData.get("currency") || "ZAR");
  const arr = formData.get("arr") ? Number(formData.get("arr")) : null;
  const renewalRaw = String(formData.get("renewalDate") || "");
  const renewalDate = renewalRaw ? new Date(renewalRaw) : null;
  const objectives = String(formData.get("objectives") || "") || null;

  const code = await nextCode();
  const engagement = await prisma.customerSuccessEngagement.create({
    data: {
      code,
      accountName,
      industryKey,
      currency,
      arr,
      renewalDate,
      objectives,
      organizationId: user.organizationId,
      ownerId: user.id,
      status: "ACTIVE",
      healthOverall: "GREEN",
      startedAt: new Date(),
      stages: { create: CS_STAGES.map((s) => ({ stage: s.key as never, order: s.order, status: "NOT_STARTED" as never })) },
    },
  });
  await audit("engagement.created", engagement.id, { code });
  revalidatePath("/cs");
  return engagement.id;
}

export async function setEngagementStageStatus(engagementId: string, stage: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  await prisma.csStageInstance.update({
    where: { engagementId_stage: { engagementId, stage: stage as never } },
    data: {
      status: status as never,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: status === "COMPLETE" ? new Date() : null,
    },
  });
  await audit("engagement.stage", engagementId, { stage, status });
  revalidatePath(`/cs/${engagementId}`);
}

export async function updateEngagementHealth(engagementId: string, health: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  await prisma.customerSuccessEngagement.update({ where: { id: engagementId }, data: { healthOverall: health as never } });
  await audit("engagement.health", engagementId, { health });
  revalidatePath(`/cs/${engagementId}`);
  revalidatePath("/cs");
}

export async function updateEngagementMeta(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const status = String(formData.get("status") || "") || undefined;
  const renewalRaw = String(formData.get("renewalDate") || "");
  const arrRaw = String(formData.get("arr") || "");
  await prisma.customerSuccessEngagement.update({
    where: { id: engagementId },
    data: {
      status: status as never,
      renewalDate: renewalRaw ? new Date(renewalRaw) : undefined,
      arr: arrRaw ? Number(arrRaw) : undefined,
    },
  });
  await audit("engagement.updated", engagementId, {});
  revalidatePath(`/cs/${engagementId}`);
  revalidatePath("/cs");
}

// ---- Link / unlink VE studies and VR tracks (single source of truth) -------
export async function linkTrackToEngagement(engagementId: string, trackId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const track = await prisma.realizationTrack.findFirst({ where: { id: trackId, organizationId: user.organizationId }, select: { id: true } });
  if (!track) throw new Error("Track not found");
  await prisma.realizationTrack.update({ where: { id: track.id }, data: { engagementId } });
  await audit("engagement.link.track", engagementId, { trackId });
  revalidatePath(`/cs/${engagementId}`);
}

export async function linkStudyToEngagement(engagementId: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const study = await prisma.study.findFirst({ where: { id: studyId, organizationId: user.organizationId }, select: { id: true } });
  if (!study) throw new Error("Study not found");
  await prisma.study.update({ where: { id: study.id }, data: { engagementId } });
  await audit("engagement.link.study", engagementId, { studyId });
  revalidatePath(`/cs/${engagementId}`);
}

export async function unlinkTrack(engagementId: string, trackId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  await prisma.realizationTrack.update({ where: { id: trackId }, data: { engagementId: null } });
  revalidatePath(`/cs/${engagementId}`);
}

export async function unlinkStudy(engagementId: string, studyId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  await prisma.study.update({ where: { id: studyId }, data: { engagementId: null } });
  revalidatePath(`/cs/${engagementId}`);
}

// ---- Phase 2: stakeholders -------------------------------------------------
export async function addStakeholder(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");
  await prisma.stakeholder.create({
    data: {
      engagementId, name,
      title: String(formData.get("title") || "") || null,
      role: String(formData.get("role") || "") || null,
      influence: formData.get("influence") ? Number(formData.get("influence")) : null,
      sentiment: (String(formData.get("sentiment") || "NEUTRAL")) as never,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  await audit("engagement.stakeholder.add", engagementId, { name });
  revalidatePath(`/cs/${engagementId}`);
}

export async function deleteStakeholder(engagementId: string, id: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  await prisma.stakeholder.delete({ where: { id } });
  revalidatePath(`/cs/${engagementId}`);
}

// ---- Phase 2: action log ---------------------------------------------------
export async function addAction(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title required");
  const due = String(formData.get("dueDate") || "");
  await prisma.actionItem.create({
    data: {
      engagementId, title,
      owner: String(formData.get("owner") || "") || null,
      dueDate: due ? new Date(due) : null,
      status: "OPEN",
    },
  });
  await audit("engagement.action.add", engagementId, { title });
  revalidatePath(`/cs/${engagementId}`);
}

export async function setActionStatus(engagementId: string, id: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  await prisma.actionItem.update({ where: { id }, data: { status: status as never } });
  revalidatePath(`/cs/${engagementId}`);
}

// ---- Phase 2: health scorecard ---------------------------------------------
export async function recordHealthScore(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const periodLabel = String(formData.get("periodLabel") || "").trim();
  if (!periodLabel) throw new Error("Period required");
  const scores: Record<string, number> = {};
  const factors = HEALTH_FACTORS.map((f) => {
    const v = Number(formData.get(`f_${f.key}`) ?? 0);
    scores[f.key] = Number.isFinite(v) ? v : 0;
    return { key: f.key, label: f.label, score: scores[f.key], weight: f.weight };
  });
  const overall = overallScore(scores);
  await prisma.healthScore.upsert({
    where: { engagementId_periodLabel: { engagementId, periodLabel } },
    create: { engagementId, periodLabel, periodDate: new Date(), overall, factors: factors as unknown as Prisma.InputJsonValue, note: String(formData.get("note") || "") || null },
    update: { periodDate: new Date(), overall, factors: factors as unknown as Prisma.InputJsonValue, note: String(formData.get("note") || "") || null },
  });
  // Roll the RAG band up to the engagement's overall health.
  await prisma.customerSuccessEngagement.update({ where: { id: engagementId }, data: { healthOverall: ragFor(overall) as never } });
  await audit("engagement.health.score", engagementId, { periodLabel, overall });
  revalidatePath(`/cs/${engagementId}`);
  revalidatePath("/cs");
}

// ---- Phase 2: renewal plan -------------------------------------------------
export async function saveRenewalPlan(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const renewalRaw = String(formData.get("renewalDate") || "");
  const data = {
    renewalDate: renewalRaw ? new Date(renewalRaw) : null,
    stage: String(formData.get("stage") || "") || null,
    valueSummary: String(formData.get("valueSummary") || "") || null,
    risks: String(formData.get("risks") || "") || null,
    procurementStatus: String(formData.get("procurementStatus") || "") || null,
    plannedActions: String(formData.get("plannedActions") || "") || null,
  };
  await prisma.renewalPlan.upsert({ where: { engagementId }, create: { engagementId, ...data }, update: data });
  // Keep the engagement's headline renewal date in step.
  if (data.renewalDate) await prisma.customerSuccessEngagement.update({ where: { id: engagementId }, data: { renewalDate: data.renewalDate } });
  await audit("engagement.renewal.save", engagementId, {});
  revalidatePath(`/cs/${engagementId}`);
  revalidatePath("/cs");
}

// ---- Phase 2: growth plan --------------------------------------------------
export async function saveGrowthPlan(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const data = {
    triggers: String(formData.get("triggers") || "") || null,
    narrative: String(formData.get("narrative") || "") || null,
    targetValue: formData.get("targetValue") ? Number(formData.get("targetValue")) : null,
  };
  await prisma.growthPlan.upsert({ where: { engagementId }, create: { engagementId, ...data }, update: data });
  await audit("engagement.growth.save", engagementId, {});
  revalidatePath(`/cs/${engagementId}`);
}

// ---- Phase 2: customer success plan ----------------------------------------
export async function saveSuccessPlan(engagementId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");
  const successPlan = {
    commitments: String(formData.get("commitments") || "") || null,
    successCriteria: String(formData.get("successCriteria") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  };
  await prisma.customerSuccessEngagement.update({
    where: { id: engagementId },
    data: { objectives: String(formData.get("objectives") || "") || null, successPlan: successPlan as unknown as Prisma.InputJsonValue },
  });
  await audit("engagement.successplan.save", engagementId, {});
  revalidatePath(`/cs/${engagementId}`);
}

// ---- Phase 3: GenAI EBR narrative + renewal-risk (template fallback) --------
type EbrContent = { executiveStory: string; valueSummary: string; risks: string; nextBestActions: string[]; expansion: string };

export async function generateEbrNarrative(engagementId: string): Promise<{ source: "ai" | "template" }> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "cs.edit")) throw new Error("Not permitted");

  const e = await prisma.customerSuccessEngagement.findFirst({
    where: { id: engagementId, organizationId: user.organizationId },
    include: {
      industry: true,
      tracks: true,
      studies: { include: { businessCase: true } },
      healthScores: { orderBy: { periodDate: "asc" } },
      renewalPlan: true, growthPlan: true,
      stakeholders: true,
      actions: true,
    },
  });
  if (!e) throw new Error("Engagement not found");
  const cur = e.currency;
  const planned = e.tracks.reduce((s, t) => s + (t.plannedValue ?? 0), 0);
  const realized = e.tracks.reduce((s, t) => s + (t.realizedValue ?? 0), 0);
  const pct = planned > 0 ? (realized / planned) * 100 : 0;
  const latestHealth = e.healthScores[e.healthScores.length - 1];
  const factors = (latestHealth?.factors as unknown as { label: string; score: number }[]) ?? [];
  const weakest = factors.slice().sort((a, b) => a.score - b.score)[0];
  const rd = e.renewalDate ? Math.round((new Date(e.renewalDate).getTime() - Date.now()) / 86400000) : null;
  const detractors = e.stakeholders.filter((s) => s.sentiment === "DETRACTOR").length;

  let content: EbrContent;
  let source: "ai" | "template" = "template";

  if (isAiEnabled()) {
    try {
      content = await generateJSON<EbrContent>({
        system:
          "You are a Customer Success Manager drafting a concise Executive Business Review (EBR) narrative for a customer. Be specific, value-led and honest about risk. This is an editable draft.",
        prompt:
          `Account: ${e.accountName}\nSolution: ${e.industry.name}\nStatus: ${e.status} · Health: ${e.healthOverall}\n` +
          `Value: ${fmtMoney(realized, cur)} realized of ${fmtMoney(planned, cur)} planned (${fmtPct(pct)}).\n` +
          (latestHealth ? `Latest health score: ${latestHealth.overall}/100; weakest factor: ${weakest?.label ?? "n/a"}.\n` : "") +
          (rd !== null ? `Renewal in ${rd} days.\n` : "") +
          (detractors ? `${detractors} detractor stakeholder(s).\n` : "") +
          (e.growthPlan?.triggers ? `Expansion triggers: ${e.growthPlan.triggers}\n` : "") +
          "\nDraft: (1) a 2–3 sentence executive story, (2) a one-line value summary, (3) the key risks, (4) 3 next best actions, (5) the expansion opportunity.",
        schema: {
          type: "object", additionalProperties: false,
          properties: {
            executiveStory: { type: "string" },
            valueSummary: { type: "string" },
            risks: { type: "string" },
            nextBestActions: { type: "array", items: { type: "string" } },
            expansion: { type: "string" },
          },
          required: ["executiveStory", "valueSummary", "risks", "nextBestActions", "expansion"],
        },
        maxTokens: 900,
      });
      source = "ai";
    } catch {
      content = templateEbr();
    }
  } else {
    content = templateEbr();
  }

  function templateEbr(): EbrContent {
    const riskBits: string[] = [];
    if (e!.healthOverall === "RED") riskBits.push("health is red");
    else if (e!.healthOverall === "AMBER") riskBits.push("health is amber");
    if (rd !== null && rd <= 90) riskBits.push(`renewal is ${rd < 0 ? "overdue" : `in ${rd} days`}`);
    if (detractors) riskBits.push(`${detractors} detractor stakeholder(s)`);
    if (weakest && weakest.score < 60) riskBits.push(`${weakest.label.toLowerCase()} is the weakest health factor`);
    return {
      executiveStory: `${e!.accountName} is ${e!.status.toLowerCase().replace("_", " ")} on the ${e!.industry.name} solution. To date the account has realized ${fmtMoney(realized, cur)} of ${fmtMoney(planned, cur)} planned value (${fmtPct(pct)}). ${e!.healthOverall === "GREEN" ? "The relationship is healthy and renewal is on track." : "Focused action is needed to protect the renewal."}`,
      valueSummary: `${fmtMoney(realized, cur)} realized of ${fmtMoney(planned, cur)} planned (${fmtPct(pct)} of plan) across ${e!.tracks.length} initiative(s).`,
      risks: riskBits.length ? `Key risks: ${riskBits.join("; ")}.` : "No material risks flagged this period.",
      nextBestActions: [
        rd !== null && rd <= 120 ? "Confirm renewal stakeholders and book the renewal EBR." : "Schedule the next executive value review.",
        weakest ? `Close the top health gap: ${weakest.label.toLowerCase()}.` : "Sustain adoption and value tracking.",
        e!.growthPlan?.triggers ? "Progress the expansion case." : "Identify an expansion opportunity.",
      ],
      expansion: e!.growthPlan?.narrative || e!.growthPlan?.triggers || "Explore adjacent workloads once value is proven.",
    };
  }

  await prisma.valueReport.create({
    data: {
      engagementId: e.id, kind: "EXECUTIVE_EBR",
      title: `EBR — ${e.accountName} · ${new Date().toLocaleDateString()}`,
      content: content as unknown as Prisma.InputJsonValue,
    },
  });

  // Close the insight → action loop: seed next-best-actions into the Action Log
  // (skip any that already exist as an open action).
  const existing = new Set(e.actions.filter((a) => a.status !== "DONE").map((a) => a.title.toLowerCase()));
  for (const t of content.nextBestActions) {
    if (t && !existing.has(t.toLowerCase())) {
      await prisma.actionItem.create({ data: { engagementId: e.id, title: t, owner: user.name, status: "OPEN", sourceStage: "GOVERNANCE_RHYTHM" } });
    }
  }

  await audit("engagement.ebr.generated", e.id, { source });
  revalidatePath(`/cs/${engagementId}`);
  return { source };
}
