/* Adds the "Mainframe Modernisation" solution profile + its new KPIs to the DB
 * via UPSERT — prod-safe: no deletes, does NOT run seedDemo (demo-org data is
 * untouched). Vercel builds run `prisma migrate deploy`, NOT seed, so new
 * catalogue entries never reach prod from a deploy — always run this script.
 *
 * Local:  npx tsx scripts/add-mainframe-modernisation.ts
 * Prod:   DATABASE_URL="<prod-neon-url>" npx tsx scripts/add-mainframe-modernisation.ts
 */
import { PrismaClient } from "@prisma/client";
import { INDUSTRY_PROFILES } from "../src/lib/domain/industries";
import { KPI_CATALOG } from "../src/lib/domain/kpis";

const prisma = new PrismaClient();
// Both mainframe profiles are refreshed (new "mainframe_mod" + the existing
// "mainframe" whose config gained the AMI products catalogue).
const PROFILE_KEYS = ["mainframe", "mainframe_mod"];
const NEW_KPI_KEYS = ["mips_capacity", "msu_r4ha_peak", "cost_per_mips", "workload_value_mapped", "low_value_workloads", "modernisation_readiness"];

async function main() {
  for (const key of PROFILE_KEYS) {
    const p = INDUSTRY_PROFILES.find((x) => x.key === key);
    if (!p) throw new Error(`Profile ${key} not found in domain`);
    await prisma.industryProfile.upsert({
      where: { key: p.key },
      create: { key: p.key, name: p.name, description: p.description, config: p.config as object },
      update: { name: p.name, description: p.description, config: p.config as object },
    });
    console.log("✓ profile", p.key);
  }

  for (const key of NEW_KPI_KEYS) {
    const k = KPI_CATALOG.find((x) => x.key === key) as any;
    if (!k) throw new Error(`KPI ${key} not found in catalogue`);
    await prisma.kpiDefinition.upsert({
      where: { key: k.key },
      create: {
        key: k.key, name: k.name, description: k.description,
        discipline: k.discipline, category: k.category, unit: k.unit,
        direction: k.direction, formula: k.formula ?? null,
        scope: k.scope ?? "study", industryKey: k.industryKey ?? null,
      },
      update: {
        name: k.name, description: k.description, unit: k.unit,
        formula: k.formula ?? null, scope: k.scope ?? "study",
      },
    });
    console.log("✓ KPI", k.key);
  }
  console.log(`done — Mainframe Modernisation profile + ${NEW_KPI_KEYS.length} KPIs upserted`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
