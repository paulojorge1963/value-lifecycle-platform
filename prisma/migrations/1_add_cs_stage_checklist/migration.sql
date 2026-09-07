-- Adds CsStageInstance.checklist (completeness-gate state).
-- Idempotent so it is safe on databases where the column already exists
-- (e.g. local dev) as well as production, which is missing it.
ALTER TABLE "CsStageInstance" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
