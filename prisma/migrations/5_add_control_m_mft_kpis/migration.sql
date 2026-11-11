-- Add Control-M Managed File Transfer (MFT) and integration-coverage KPI
-- definitions so VR/VRA workbook baselines can reference them by key.
-- A KpiTarget.kpiKey is a FK to KpiDefinition.key, so these rows must exist
-- before a workbook that baselines them can be imported. The seed
-- (prisma/seed.ts) upserts the same catalogue, but Vercel's build runs
-- `prisma migrate deploy` without reseeding, so the keys are inserted here too.
-- Idempotent: ON CONFLICT ("key") DO NOTHING.
INSERT INTO "KpiDefinition" ("id", "key", "name", "description", "discipline", "category", "unit", "direction", "scope", "isSystem")
VALUES
  (gen_random_uuid()::text, 'mft_file_transfers', 'MFT file transfers',
   'Number of managed file-transfer (MFT) jobs run through Control-M in the period — a volume measure of file-movement workload consolidated onto Control-M MFT.',
   'VR', 'OTHER', 'count', 'HIGHER_IS_BETTER', 'track', true),
  (gen_random_uuid()::text, 'files_transferred', 'Files transferred',
   'Count of individual files moved by Control-M MFT in the period (one transfer job can move many files) — demonstrates the scale of file movement under management.',
   'VR', 'OTHER', 'count', 'HIGHER_IS_BETTER', 'track', true),
  (gen_random_uuid()::text, 'integrations_count', 'Integrations in Control-M (count / types)',
   'Number of integrations (and distinct integration types) orchestrated through Control-M — applications, platforms and data services connected — a measure of estate coverage and value demonstrated.',
   'VR', 'OTHER', 'count', 'HIGHER_IS_BETTER', 'track', true)
ON CONFLICT ("key") DO NOTHING;
