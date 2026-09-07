-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('VE', 'VR');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VALUE_ENGINEER', 'VALUE_REALIZATION_MANAGER', 'CUSTOMER_SUCCESS_MANAGER', 'REVIEWER', 'VIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CsStageKey" AS ENUM ('HANDOVER', 'ONBOARDING', 'ADOPTION', 'VALUE_REALISATION', 'HEALTH_MANAGEMENT', 'GOVERNANCE_RHYTHM', 'RENEWAL_MANAGEMENT', 'EXPANSION_GROWTH');

-- CreateEnum
CREATE TYPE "CsEngagementStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'RENEWED', 'CHURNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('PROMOTER', 'NEUTRAL', 'DETRACTOR');

-- CreateEnum
CREATE TYPE "VePhaseKey" AS ENUM ('ORIENTATION', 'INFORMATION', 'FUNCTION_ANALYSIS', 'CREATIVE', 'EVALUATION', 'DEVELOPMENT', 'PRESENTATION', 'HANDOVER');

-- CreateEnum
CREATE TYPE "VrPhaseKey" AS ENUM ('INTAKE', 'BASELINE', 'IMPLEMENTATION_PLANNING', 'ADOPTION', 'EXECUTION', 'VALUE_TRACKING', 'CLOSEOUT');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'HANDED_OVER', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('PLANNING', 'IN_FLIGHT', 'ON_HOLD', 'REALIZED', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrackOrigin" AS ENUM ('VE_HANDOVER', 'STANDALONE');

-- CreateEnum
CREATE TYPE "Health" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "FunctionKind" AS ENUM ('BASIC', 'SECONDARY');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PROPOSED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "WorkPackageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'CLOSED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "BenefitCategory" AS ENUM ('COST_SAVING', 'REVENUE_UPLIFT', 'RISK_REDUCTION', 'TIME_SAVING', 'QUALITY', 'SCHEDULE', 'RELIABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "KpiDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('MONTHLY', 'QUARTERLY_QBR', 'EXECUTIVE_EBR', 'ADHOC', 'CLOSEOUT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "showMembersOnLogin" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "passwordHash" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryProfile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndustryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseTemplate" (
    "id" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "vePhase" "VePhaseKey",
    "vrPhase" "VrPhaseKey",
    "industryKey" TEXT,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "keyQuestions" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PhaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "industryKey" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "category" "BenefitCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "direction" "KpiDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER',
    "formula" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'study',
    "industryKey" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KpiDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "StudyStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "industryKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "engagementId" TEXT,
    "studyType" TEXT,
    "scope" TEXT,
    "problemStatement" TEXT,
    "evaluationCriteria" JSONB,
    "estimatedValue" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startedAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPhase" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "phase" "VePhaseKey" NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checklist" JSONB,

    CONSTRAINT "StudyPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseTask" (
    "id" TEXT NOT NULL,
    "studyPhaseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhaseTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoItem" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "value" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionItem" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "verb" TEXT NOT NULL,
    "noun" TEXT NOT NULL,
    "kind" "FunctionKind" NOT NULL DEFAULT 'SECONDARY',
    "cost" DOUBLE PRECISION,
    "worth" DOUBLE PRECISION,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FunctionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alternative" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "functionId" TEXT,
    "idea" TEXT NOT NULL,
    "description" TEXT,
    "scores" JSONB,
    "weightedScore" DOUBLE PRECISION,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommendationId" TEXT,

    CONSTRAINT "Alternative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "technicalDetail" TEXT,
    "commercialDetail" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "estimatedValue" DOUBLE PRECISION,
    "estimatedCost" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCase" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "roiPct" DOUBLE PRECISION,
    "paybackMonths" DOUBLE PRECISION,
    "npv" DOUBLE PRECISION,
    "irrPct" DOUBLE PRECISION,
    "discountRatePct" DOUBLE PRECISION DEFAULT 10,
    "horizonYears" INTEGER DEFAULT 5,
    "lccaNotes" TEXT,
    "riskNarrative" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "businessCaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "businessCaseId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" "BenefitCategory",
    "amount" DOUBLE PRECISION NOT NULL,
    "year" INTEGER,
    "recurring" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "studyId" TEXT,
    "trackId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "likelihood" INTEGER,
    "impact" INTEGER,
    "mitigation" TEXT,
    "owner" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverArtifact" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "data" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "trackId" TEXT,

    CONSTRAINT "HandoverArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealizationTrack" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TrackStatus" NOT NULL DEFAULT 'PLANNING',
    "health" "Health" NOT NULL DEFAULT 'GREEN',
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "industryKey" TEXT NOT NULL,
    "origin" "TrackOrigin" NOT NULL DEFAULT 'VE_HANDOVER',
    "studyId" TEXT,
    "ownerId" TEXT NOT NULL,
    "engagementId" TEXT,
    "objectives" TEXT,
    "successCriteria" TEXT,
    "plannedValue" DOUBLE PRECISION,
    "realizedValue" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startedAt" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealizationTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VrPhaseInstance" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "phase" "VrPhaseKey" NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "checklist" JSONB,

    CONSTRAINT "VrPhaseInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackage" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkPackageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionPlan" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "changeImpact" TEXT,
    "trainingPlan" TEXT,
    "commsPlan" TEXT,
    "championNetwork" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdoptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionActivity" (
    "id" TEXT NOT NULL,
    "adoptionPlanId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "audience" TEXT,
    "status" "WorkPackageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdoptionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benefit" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "BenefitCategory" NOT NULL,
    "plannedValue" DOUBLE PRECISION NOT NULL,
    "realizedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "firstMeasuredAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueReport" (
    "id" TEXT NOT NULL,
    "trackId" TEXT,
    "engagementId" TEXT,
    "kind" "ReportKind" NOT NULL,
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValueReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonLearned" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "category" TEXT,
    "detail" TEXT NOT NULL,
    "feedsBackTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonLearned_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "studyId" TEXT,
    "trackId" TEXT,
    "baselineValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "frequency" TEXT,
    "dataSource" TEXT,
    "ownerName" TEXT,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiActual" (
    "id" TEXT NOT NULL,
    "kpiTargetId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiActual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "studyId" TEXT,
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "studyId" TEXT,
    "trackId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "authorId" TEXT,
    "snapshot" JSONB NOT NULL,
    "studyId" TEXT,
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSuccessEngagement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "status" "CsEngagementStatus" NOT NULL DEFAULT 'ACTIVE',
    "healthOverall" "Health" NOT NULL DEFAULT 'GREEN',
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "industryKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "arr" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "renewalDate" TIMESTAMP(3),
    "objectives" TEXT,
    "successPlan" JSONB,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSuccessEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsStageInstance" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "stage" "CsStageKey" NOT NULL,
    "order" INTEGER NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CsStageInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "role" TEXT,
    "influence" INTEGER,
    "sentiment" "Sentiment" NOT NULL DEFAULT 'NEUTRAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "sourceStage" "CsStageKey",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScore" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodDate" TIMESTAMP(3) NOT NULL,
    "overall" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalPlan" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "renewalDate" TIMESTAMP(3),
    "stage" TEXT,
    "valueSummary" TEXT,
    "risks" TEXT,
    "procurementStatus" TEXT,
    "plannedActions" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthPlan" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "triggers" TEXT,
    "opportunities" JSONB,
    "targetValue" DOUBLE PRECISION,
    "narrative" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WpDeps" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WpDeps_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IndustryProfile_key_key" ON "IndustryProfile"("key");

-- CreateIndex
CREATE INDEX "IndustryProfile_key_idx" ON "IndustryProfile"("key");

-- CreateIndex
CREATE INDEX "PhaseTemplate_discipline_industryKey_idx" ON "PhaseTemplate"("discipline", "industryKey");

-- CreateIndex
CREATE INDEX "ContentTemplate_discipline_kind_industryKey_idx" ON "ContentTemplate"("discipline", "kind", "industryKey");

-- CreateIndex
CREATE UNIQUE INDEX "KpiDefinition_key_key" ON "KpiDefinition"("key");

-- CreateIndex
CREATE INDEX "KpiDefinition_discipline_industryKey_idx" ON "KpiDefinition"("discipline", "industryKey");

-- CreateIndex
CREATE UNIQUE INDEX "Study_code_key" ON "Study"("code");

-- CreateIndex
CREATE INDEX "Study_organizationId_status_idx" ON "Study"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Study_industryKey_idx" ON "Study"("industryKey");

-- CreateIndex
CREATE INDEX "StudyPhase_studyId_idx" ON "StudyPhase"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPhase_studyId_phase_key" ON "StudyPhase"("studyId", "phase");

-- CreateIndex
CREATE INDEX "PhaseTask_studyPhaseId_idx" ON "PhaseTask"("studyPhaseId");

-- CreateIndex
CREATE INDEX "InfoItem_studyId_idx" ON "InfoItem"("studyId");

-- CreateIndex
CREATE INDEX "FunctionItem_studyId_idx" ON "FunctionItem"("studyId");

-- CreateIndex
CREATE INDEX "Alternative_studyId_idx" ON "Alternative"("studyId");

-- CreateIndex
CREATE INDEX "Recommendation_studyId_status_idx" ON "Recommendation"("studyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCase_studyId_key" ON "BusinessCase"("studyId");

-- CreateIndex
CREATE INDEX "BusinessCase_studyId_idx" ON "BusinessCase"("studyId");

-- CreateIndex
CREATE INDEX "Scenario_businessCaseId_idx" ON "Scenario"("businessCaseId");

-- CreateIndex
CREATE INDEX "CostItem_businessCaseId_idx" ON "CostItem"("businessCaseId");

-- CreateIndex
CREATE INDEX "RiskItem_studyId_idx" ON "RiskItem"("studyId");

-- CreateIndex
CREATE INDEX "RiskItem_trackId_idx" ON "RiskItem"("trackId");

-- CreateIndex
CREATE INDEX "HandoverArtifact_studyId_type_idx" ON "HandoverArtifact"("studyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "RealizationTrack_code_key" ON "RealizationTrack"("code");

-- CreateIndex
CREATE INDEX "RealizationTrack_organizationId_status_idx" ON "RealizationTrack"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RealizationTrack_studyId_idx" ON "RealizationTrack"("studyId");

-- CreateIndex
CREATE INDEX "VrPhaseInstance_trackId_idx" ON "VrPhaseInstance"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "VrPhaseInstance_trackId_phase_key" ON "VrPhaseInstance"("trackId", "phase");

-- CreateIndex
CREATE INDEX "WorkPackage_trackId_status_idx" ON "WorkPackage"("trackId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdoptionPlan_trackId_key" ON "AdoptionPlan"("trackId");

-- CreateIndex
CREATE INDEX "AdoptionActivity_adoptionPlanId_idx" ON "AdoptionActivity"("adoptionPlanId");

-- CreateIndex
CREATE INDEX "Benefit_trackId_idx" ON "Benefit"("trackId");

-- CreateIndex
CREATE INDEX "ValueReport_trackId_kind_idx" ON "ValueReport"("trackId", "kind");

-- CreateIndex
CREATE INDEX "ValueReport_engagementId_idx" ON "ValueReport"("engagementId");

-- CreateIndex
CREATE INDEX "LessonLearned_trackId_idx" ON "LessonLearned"("trackId");

-- CreateIndex
CREATE INDEX "KpiTarget_studyId_idx" ON "KpiTarget"("studyId");

-- CreateIndex
CREATE INDEX "KpiTarget_trackId_idx" ON "KpiTarget"("trackId");

-- CreateIndex
CREATE INDEX "KpiActual_kpiTargetId_idx" ON "KpiActual"("kpiTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiActual_kpiTargetId_periodLabel_key" ON "KpiActual"("kpiTargetId", "periodLabel");

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_studyId_idx" ON "AuditEvent"("studyId");

-- CreateIndex
CREATE INDEX "AuditEvent_trackId_idx" ON "AuditEvent"("trackId");

-- CreateIndex
CREATE INDEX "DocumentVersion_entityType_entityId_idx" ON "DocumentVersion"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSuccessEngagement_code_key" ON "CustomerSuccessEngagement"("code");

-- CreateIndex
CREATE INDEX "CustomerSuccessEngagement_organizationId_status_idx" ON "CustomerSuccessEngagement"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CustomerSuccessEngagement_industryKey_idx" ON "CustomerSuccessEngagement"("industryKey");

-- CreateIndex
CREATE INDEX "CsStageInstance_engagementId_idx" ON "CsStageInstance"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "CsStageInstance_engagementId_stage_key" ON "CsStageInstance"("engagementId", "stage");

-- CreateIndex
CREATE INDEX "Stakeholder_engagementId_idx" ON "Stakeholder"("engagementId");

-- CreateIndex
CREATE INDEX "ActionItem_engagementId_idx" ON "ActionItem"("engagementId");

-- CreateIndex
CREATE INDEX "HealthScore_engagementId_idx" ON "HealthScore"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthScore_engagementId_periodLabel_key" ON "HealthScore"("engagementId", "periodLabel");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalPlan_engagementId_key" ON "RenewalPlan"("engagementId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthPlan_engagementId_key" ON "GrowthPlan"("engagementId");

-- CreateIndex
CREATE INDEX "_WpDeps_B_index" ON "_WpDeps"("B");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDefinition" ADD CONSTRAINT "KpiDefinition_industryKey_fkey" FOREIGN KEY ("industryKey") REFERENCES "IndustryProfile"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_industryKey_fkey" FOREIGN KEY ("industryKey") REFERENCES "IndustryProfile"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPhase" ADD CONSTRAINT "StudyPhase_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseTask" ADD CONSTRAINT "PhaseTask_studyPhaseId_fkey" FOREIGN KEY ("studyPhaseId") REFERENCES "StudyPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseTask" ADD CONSTRAINT "PhaseTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoItem" ADD CONSTRAINT "InfoItem_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionItem" ADD CONSTRAINT "FunctionItem_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionItem" ADD CONSTRAINT "FunctionItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FunctionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alternative" ADD CONSTRAINT "Alternative_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alternative" ADD CONSTRAINT "Alternative_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "FunctionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alternative" ADD CONSTRAINT "Alternative_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessCase" ADD CONSTRAINT "BusinessCase_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_businessCaseId_fkey" FOREIGN KEY ("businessCaseId") REFERENCES "BusinessCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_businessCaseId_fkey" FOREIGN KEY ("businessCaseId") REFERENCES "BusinessCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverArtifact" ADD CONSTRAINT "HandoverArtifact_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverArtifact" ADD CONSTRAINT "HandoverArtifact_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoverArtifact" ADD CONSTRAINT "HandoverArtifact_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizationTrack" ADD CONSTRAINT "RealizationTrack_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizationTrack" ADD CONSTRAINT "RealizationTrack_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizationTrack" ADD CONSTRAINT "RealizationTrack_industryKey_fkey" FOREIGN KEY ("industryKey") REFERENCES "IndustryProfile"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizationTrack" ADD CONSTRAINT "RealizationTrack_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizationTrack" ADD CONSTRAINT "RealizationTrack_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizationTrack" ADD CONSTRAINT "RealizationTrack_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VrPhaseInstance" ADD CONSTRAINT "VrPhaseInstance_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionPlan" ADD CONSTRAINT "AdoptionPlan_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionActivity" ADD CONSTRAINT "AdoptionActivity_adoptionPlanId_fkey" FOREIGN KEY ("adoptionPlanId") REFERENCES "AdoptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benefit" ADD CONSTRAINT "Benefit_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueReport" ADD CONSTRAINT "ValueReport_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueReport" ADD CONSTRAINT "ValueReport_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearned" ADD CONSTRAINT "LessonLearned_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_kpiKey_fkey" FOREIGN KEY ("kpiKey") REFERENCES "KpiDefinition"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiActual" ADD CONSTRAINT "KpiActual_kpiTargetId_fkey" FOREIGN KEY ("kpiTargetId") REFERENCES "KpiTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "RealizationTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSuccessEngagement" ADD CONSTRAINT "CustomerSuccessEngagement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSuccessEngagement" ADD CONSTRAINT "CustomerSuccessEngagement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSuccessEngagement" ADD CONSTRAINT "CustomerSuccessEngagement_industryKey_fkey" FOREIGN KEY ("industryKey") REFERENCES "IndustryProfile"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSuccessEngagement" ADD CONSTRAINT "CustomerSuccessEngagement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsStageInstance" ADD CONSTRAINT "CsStageInstance_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalPlan" ADD CONSTRAINT "RenewalPlan_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthPlan" ADD CONSTRAINT "GrowthPlan_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "CustomerSuccessEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WpDeps" ADD CONSTRAINT "_WpDeps_A_fkey" FOREIGN KEY ("A") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WpDeps" ADD CONSTRAINT "_WpDeps_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

