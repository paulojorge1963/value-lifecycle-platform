// One-off, SAFE catalogue string fix: en-US "Realization" -> en-ZA "Realisation"
// in the reference/catalogue tables only (PhaseTemplate, ContentTemplate,
// KpiDefinition). NO deletes. Does NOT touch studies, tracks, engagements,
// users, orgs, or any customer data. Idempotent (whole-word, so re-runs are
// no-ops). DRY-RUN by default — pass --apply to write.
//
// Run against prod:  DATABASE_URL="<prod pooled Neon url>" node scripts/fix-realisation-catalogue.mjs --apply
// Preview only:      DATABASE_URL="<...>" node scripts/fix-realisation-catalogue.mjs
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

const fix = (s) =>
  typeof s === "string" ? s.replace(/\bRealization\b/g, "Realisation").replace(/\brealization\b/g, "realisation") : s;
const fixJson = (j) => (j == null ? j : JSON.parse(fix(JSON.stringify(j))));
const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

async function main() {
  const hits = [];
  let updated = 0;

  for (const t of await prisma.phaseTemplate.findMany()) {
    const next = { title: fix(t.title), purpose: fix(t.purpose), keyQuestions: fixJson(t.keyQuestions), content: fixJson(t.content) };
    if (changed(next, { title: t.title, purpose: t.purpose, keyQuestions: t.keyQuestions, content: t.content })) {
      hits.push(`PhaseTemplate "${t.title}" (${t.id})`);
      if (APPLY) await prisma.phaseTemplate.update({ where: { id: t.id }, data: next });
      updated++;
    }
  }
  for (const c of await prisma.contentTemplate.findMany()) {
    const next = { title: fix(c.title), body: fix(c.body), metadata: fixJson(c.metadata) };
    if (changed(next, { title: c.title, body: c.body, metadata: c.metadata })) {
      hits.push(`ContentTemplate "${c.title}" (${c.id})`);
      if (APPLY) await prisma.contentTemplate.update({ where: { id: c.id }, data: next });
      updated++;
    }
  }
  for (const k of await prisma.kpiDefinition.findMany()) {
    const next = { name: fix(k.name), description: fix(k.description), formula: fix(k.formula) };
    if (changed(next, { name: k.name, description: k.description, formula: k.formula })) {
      hits.push(`KpiDefinition "${k.key}"`);
      if (APPLY) await prisma.kpiDefinition.update({ where: { id: k.id }, data: next });
      updated++;
    }
  }

  console.log(hits.length ? "Rows with 'Realization' to fix:\n  - " + hits.join("\n  - ") : "No catalogue rows contain 'Realization'.");
  console.log(`\n${APPLY ? "UPDATED" : "WOULD UPDATE"} ${updated} catalogue row(s). No studies / tracks / engagements / users / orgs touched.`);
  if (!APPLY && updated) console.log("Dry run — re-run with --apply to write the changes.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
