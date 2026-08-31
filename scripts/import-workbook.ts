/**
 * CLI wrapper over the shared workbook importer (src/lib/import/workbook-import.ts).
 *
 *   npx tsx scripts/import-workbook.ts <file.xlsx> [options]
 *     --owner <email>   owner user (default: an org VE/VRM/CSM, else first member)
 *     --org <id>        organization id (default: org_demo)
 *     --code <CODE>     force the VE/VR/CS code (default: auto <PREFIX>-YYYY-NNN)
 *     --dry-run         parse + report only, write nothing
 */
import { readFile } from "fs/promises";
import { PrismaClient } from "@prisma/client";
import { importWorkbook } from "../src/lib/import/workbook-import";

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const opt = (name: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = argv.includes("--dry-run");
const ORG_ID = opt("org") ?? "org_demo";
const OWNER_EMAIL = opt("owner");
const FORCE_CODE = opt("code");
if (!file) { console.error("Usage: import-workbook.ts <file.xlsx> [--owner email] [--org id] [--code CODE] [--dry-run]"); process.exit(1); }

const KIND_LABEL = { VE: "VE Discovery Workbook", VR: "VR Intake Workbook", CS: "CS Intake Workbook" } as const;
const PLAN_LABEL = { VE: "VE study plan", VR: "VR track plan", CS: "CS engagement plan" } as const;

(async () => {
  const buf = await readFile(file);
  const res = await importWorkbook(buf, { orgId: ORG_ID, ownerEmail: OWNER_EMAIL, forceCode: FORCE_CODE, dryRun: DRY }, prisma);
  console.log(`File: ${file}\nOrg: ${ORG_ID}  Owner: ${OWNER_EMAIL ?? "(auto)"}  ${DRY ? "[DRY RUN]" : "[WRITE]"}\nType: ${KIND_LABEL[res.kind]}\n`);
  console.log(`${PLAN_LABEL[res.kind]}:\n` + JSON.stringify(res.plan, null, 2));
  if (DRY) { console.log(`\n[dry-run] nothing written.${res.existingId ? `  (NOTE: code ${res.code} already exists)` : ""}`); }
  else console.log(`\n✓ Imported ${res.entity} ${res.code} (${res.entityId}).`);
  await prisma.$disconnect();
})().catch(async (e) => { console.error("\n✗ Import failed:", e.message); await prisma.$disconnect(); process.exit(1); });
