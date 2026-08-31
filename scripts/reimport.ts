/**
 * reimport.ts — delete existing entities by code (FK-safe) and re-import workbooks.
 *
 * The importer CREATES, it never upserts — so re-running it on the same code makes
 * a duplicate. This helper deletes the named codes first (handling the study↔track↔
 * engagement foreign keys and their link order), then runs import-workbook.ts for
 * each file, in the order you list them.
 *
 * Usage (run from the app root):
 *   npx tsx scripts/reimport.ts \
 *     --delete VE-2026-050 VR-2026-050 CS-2026-004 \
 *     --import path/VE-Discovery.xlsx:VE-2026-050 \
 *              path/VR-Intake.xlsx:VR-2026-050 \
 *              path/CS-Intake.xlsx
 *
 * Notes:
 *   - `--import file:CODE` forces the code (passes --code to the importer). `file`
 *     alone lets the importer auto-generate the code.
 *   - Import VE → VR → CS so the CS "Links" tab can resolve the study/track by code.
 *   - `--delete` codes can be listed in any order; deletion order is handled for you.
 *   - `--dry-run` shows what would be deleted/imported without changing anything.
 */
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const IMPORTER = join(__dirname, "import-workbook.ts");
const CODE_RE = /:([A-Za-z]{2,4}-\d{4}-[A-Za-z0-9]+)$/;

function parseArgs(argv: string[]) {
  const deleteCodes: string[] = [];
  const imports: { file: string; code?: string }[] = [];
  let dryRun = false;
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else if (a === "--dry-run") { dryRun = true; i++; }
    else if (a === "--delete") { i++; while (i < argv.length && !argv[i].startsWith("--")) deleteCodes.push(argv[i++]); }
    else if (a === "--import") {
      i++;
      while (i < argv.length && !argv[i].startsWith("--")) {
        const entry = argv[i++];
        const m = entry.match(CODE_RE);
        if (m) imports.push({ file: entry.slice(0, m.index), code: m[1] });
        else imports.push({ file: entry });
      }
    } else { console.error(`Unknown argument: ${a}\n`); printHelp(); process.exit(1); }
  }
  return { deleteCodes, imports, dryRun };
}

function printHelp() {
  console.log(`reimport.ts — delete-then-reimport helper

  npx tsx scripts/reimport.ts --delete <CODE...> --import <file[:CODE]...> [--dry-run]

Example:
  npx tsx scripts/reimport.ts \\
    --delete VE-2026-050 VR-2026-050 CS-2026-004 \\
    --import ~/VE.xlsx:VE-2026-050 ~/VR.xlsx:VR-2026-050 ~/CS.xlsx`);
}

async function deleteByCodes(codes: string[], dryRun: boolean) {
  const tracks = await prisma.realizationTrack.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const studies = await prisma.study.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const engagements = await prisma.customerSuccessEngagement.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });

  const found = new Set([...tracks, ...studies, ...engagements].map((e) => e.code));
  for (const c of codes) if (!found.has(c)) console.log(`  · ${c} — not found, skipping`);

  if (dryRun) {
    for (const t of tracks) console.log(`  · would delete track ${t.code}`);
    for (const s of studies) console.log(`  · would delete study ${s.code}`);
    for (const e of engagements) console.log(`  · would delete engagement ${e.code}`);
    return;
  }

  // 1. Unlink cross-references so no Restrict FK blocks the deletes.
  for (const e of engagements) {
    await prisma.study.updateMany({ where: { engagementId: e.id }, data: { engagementId: null } });
    await prisma.realizationTrack.updateMany({ where: { engagementId: e.id }, data: { engagementId: null } });
  }
  for (const s of studies) {
    await prisma.realizationTrack.updateMany({ where: { studyId: s.id }, data: { studyId: null } });
  }
  // 2. Delete in dependency order: tracks → studies → engagements (children cascade).
  for (const t of tracks) { await prisma.realizationTrack.delete({ where: { id: t.id } }); console.log(`  · deleted track ${t.code}`); }
  for (const s of studies) { await prisma.study.delete({ where: { id: s.id } }); console.log(`  · deleted study ${s.code}`); }
  for (const e of engagements) { await prisma.customerSuccessEngagement.delete({ where: { id: e.id } }); console.log(`  · deleted engagement ${e.code}`); }
}

async function main() {
  const { deleteCodes, imports, dryRun } = parseArgs(process.argv.slice(2));
  if (!deleteCodes.length && !imports.length) { printHelp(); process.exit(0); }

  if (deleteCodes.length) {
    console.log(`\n${dryRun ? "[dry-run] " : ""}Deleting ${deleteCodes.length} code(s): ${deleteCodes.join(", ")}`);
    await deleteByCodes(deleteCodes, dryRun);
  }

  if (imports.length) {
    console.log(`\n${dryRun ? "[dry-run] " : ""}Importing ${imports.length} workbook(s):`);
    for (const { file, code } of imports) {
      // In dry-run we still call the importer (with --dry-run) so you see its parse plan.
      const args = ["tsx", IMPORTER, file, ...(code ? ["--code", code] : []), ...(dryRun ? ["--dry-run"] : [])];
      console.log(`\n→ npx ${args.join(" ")}`);
      try { execFileSync("npx", args, { stdio: "inherit" }); }
      catch { console.error(`  ✗ import failed for ${file}`); process.exitCode = 1; }
    }
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
