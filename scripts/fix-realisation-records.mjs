// Fix US "realize/realization" spelling in SEEDED/USER RECORD free-text fields
// (titles, names, labels, summaries, objectives) to British "realise/realisation".
// Complements scripts/fix-realisation-catalogue.mjs (which covers Phase/Content/Kpi
// TEMPLATES) — this one covers the record/instance data a user sees (e.g. a track
// titled "… — Realization"). Non-destructive: it only rewrites text in the listed
// fields, never deletes, never touches `code`/enum/relation fields. Idempotent.
//
// Dry-run (default, prints what WOULD change):
//   node scripts/fix-realisation-records.mjs
// Apply:
//   node scripts/fix-realisation-records.mjs --apply
// Prod (apply):
//   DATABASE_URL="<prod-neon-url>" node scripts/fix-realisation-records.mjs --apply
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const p = new PrismaClient();

// Whole-word realize/realise family → British, preserving case (Title / lower / UPPER).
function toBritish(s) {
  if (typeof s !== "string" || !s) return s;
  return s
    .replace(/\bRealiz(ation|ations|e|es|ed|ing)\b/g, (_, g) => "Realis" + g)
    .replace(/\brealiz(ation|ations|e|es|ed|ing)\b/g, (_, g) => "realis" + g)
    .replace(/\bREALIZ(ATION|ATIONS|E|ES|ED|ING)\b/g, (_, g) => "REALIS" + g);
}

// model delegate -> text fields to sweep
const TARGETS = [
  ["study", ["title", "summary", "customerName"]],
  ["realizationTrack", ["title", "objectives"]],
  ["recommendation", ["title", "summary"]],
  ["riskItem", ["title"]],
  ["handoverArtifact", ["title"]],
  ["benefit", ["label"]],
  ["workPackage", ["name"]],
  ["valueReport", ["title"]],
  ["customerSuccessEngagement", ["accountName", "objectives"]],
  ["stakeholder", ["name", "title"]],
  ["actionItem", ["title"]],
  ["adoptionActivity", ["label"]],
  ["infoItem", ["label"]],
  ["scenario", ["name"]],
  ["costItem", ["label"]],
  ["phaseTask", ["label"]],
];

let total = 0;
try {
  for (const [model, fields] of TARGETS) {
    const delegate = p[model];
    if (!delegate) { console.warn(`! skip ${model} (no delegate)`); continue; }
    const select = { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) };
    const rows = await delegate.findMany({ select });
    for (const row of rows) {
      const data = {};
      for (const f of fields) {
        const before = row[f];
        const after = toBritish(before);
        if (after !== before) data[f] = after;
      }
      if (Object.keys(data).length) {
        total++;
        for (const f of Object.keys(data)) {
          console.log(`${model}.${f}  [${row.id}]`);
          console.log(`   - ${JSON.stringify(row[f])}`);
          console.log(`   + ${JSON.stringify(data[f])}`);
        }
        if (APPLY) await delegate.update({ where: { id: row.id }, data });
      }
    }
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"} — ${total} record(s) ${APPLY ? "updated" : "would change"}.`);
  if (!APPLY && total) console.log("Re-run with --apply to write the changes.");
} finally {
  await p.$disconnect();
}
