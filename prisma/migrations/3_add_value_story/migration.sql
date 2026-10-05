-- Value-story capture for richer CVR exports
ALTER TABLE "Study" ADD COLUMN "whyNow" TEXT;
ALTER TABLE "Study" ADD COLUMN "whyThisSolution" TEXT;
ALTER TABLE "Study" ADD COLUMN "valueStory" JSONB;
ALTER TABLE "Recommendation" ADD COLUMN "currentState" TEXT;
ALTER TABLE "Recommendation" ADD COLUMN "implications" TEXT;
