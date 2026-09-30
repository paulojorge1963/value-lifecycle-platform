-- Add optional customer/account name to Study for client-facing exports (CVR).
ALTER TABLE "Study" ADD COLUMN "customerName" TEXT;
