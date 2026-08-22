"use server";

// =============================================================================
//  Customer Success — server actions (Phase-1 MVP).
//  A CS engagement is per-account and continuous; it references the account's
//  VE studies and VR tracks rather than copying them.
// =============================================================================

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { CS_STAGES } from "@/lib/domain/cs-stages";

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
