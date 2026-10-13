// Add the 3 Control-M operational KPIs to the KpiDefinition catalogue
// (failed_jobs, legacy_schedulers_live, jobs_as_code_adoption). These are also
// in src/lib/domain/kpis.ts (source of truth); this script upserts them WITHOUT
// a full db:seed (which deletes demo-org studies). Idempotent.
//
// Local:  node scripts/add-control-m-kpis.mjs
// Prod:   DATABASE_URL="<prod-neon-url>" node scripts/add-control-m-kpis.mjs
import { PrismaClient } from "@prisma/client";

const KPIS = [
  { key: "failed_jobs", name: "Failed / rerun jobs per month",
    description: "Count of job failures and reruns per month — lower is better; a proxy for batch reliability and operational toil.",
    discipline: "VR", category: "RELIABILITY", unit: "count", direction: "LOWER_IS_BETTER", scope: "track" },
  { key: "legacy_schedulers_live", name: "Legacy schedulers still live",
    description: "Number of legacy schedulers still in production — lower is better as workloads consolidate onto Control-M.",
    discipline: "VR", category: "COST_SAVING", unit: "count", direction: "LOWER_IS_BETTER", scope: "track" },
  { key: "jobs_as_code_adoption", name: "Jobs-as-code adoption",
    description: "Share of job definitions managed as jobs-as-code in pipelines — higher is better for change velocity and governance.",
    discipline: "VR", category: "OTHER", unit: "%", direction: "HIGHER_IS_BETTER", scope: "track" },
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
