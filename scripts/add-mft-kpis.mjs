// Add the 3 Control-M Managed File Transfer (MFT) KPIs to the KpiDefinition
// catalogue (mft_file_transfers, files_transferred, integrations_count). These
// are also in src/lib/domain/kpis.ts (source of truth); this script upserts them
// WITHOUT a full db:seed (which deletes demo-org studies). Idempotent.
//
// Companion to add-control-m-kpis.mjs. Vercel builds run `prisma migrate deploy`
// (NOT seed), so new catalogue KPIs never reach prod from a deploy — run this.
//
// Local:  node scripts/add-mft-kpis.mjs
// Prod:   DATABASE_URL="<prod-neon-url>" node scripts/add-mft-kpis.mjs
import { PrismaClient } from "@prisma/client";

const KPIS = [
  { key: "mft_file_transfers", name: "MFT file transfers",
    description: "Number of managed file-transfer (MFT) jobs run through Control-M in the period — a volume measure of file-movement workload consolidated onto Control-M MFT.",
    discipline: "VR", category: "OTHER", unit: "count", direction: "HIGHER_IS_BETTER", scope: "track" },
  { key: "files_transferred", name: "Files transferred",
    description: "Count of individual files moved by Control-M MFT in the period (one transfer job can move many files) — demonstrates the scale of file movement under management.",
    discipline: "VR", category: "OTHER", unit: "count", direction: "HIGHER_IS_BETTER", scope: "track" },
  { key: "integrations_count", name: "Integrations in Control-M (count / types)",
    description: "Number of integrations (and distinct integration types) orchestrated through Control-M — applications, platforms and data services connected — a measure of estate coverage and value demonstrated.",
    discipline: "VR", category: "OTHER", unit: "count", direction: "HIGHER_IS_BETTER", scope: "track" },
];

const p = new PrismaClient();
try {
  for (const k of KPIS) {
    await p.kpiDefinition.upsert({
      where: { key: k.key },
      create: { key: k.key, name: k.name, description: k.description, discipline: k.discipline,
        category: k.category, unit: k.unit, direction: k.direction, scope: k.scope, industryKey: null },
      update: { name: k.name, description: k.description, unit: k.unit, scope: k.scope },
    });
    console.log(`upserted KPI: ${k.key} (${k.name})`);
  }
  const total = await p.kpiDefinition.count();
  console.log(`done — KpiDefinition catalogue now has ${total} entries.`);
} finally {
  await p.$disconnect();
}
