/* Regenerate the blank capture workbooks in the OneDrive Value-Capture-Templates
 * folder from the app's buildTemplate (the drift-free source of truth), so the
 * folder copies match the current app (new profiles, study types, KPIs, the AMI
 * product-inventory tab, etc.). The app download route uses the same buildTemplate.
 *
 *   npx tsx scripts/export-folder-templates.ts
 */
import { buildTemplate, type TemplateKind } from "../src/lib/import/templates";

const DIR = "/Users/paul/Library/CloudStorage/OneDrive-BlueTurtleTechnologies/Sales Enablement/Value-Capture-Templates";
const OUT: Record<TemplateKind, string> = {
  VE: `${DIR}/BlueTurtle-VE-Discovery-Workbook.xlsx`,
  VR: `${DIR}/BlueTurtle-VR-Intake-Workbook.xlsx`,
  CS: `${DIR}/BlueTurtle-CS-Intake-Workbook.xlsx`,
  VRA: `${DIR}/BlueTurtle-VRA-Intake-Workbook.xlsx`,
};

async function main() {
  for (const kind of ["VE", "VR", "CS"] as TemplateKind[]) {
    const wb = buildTemplate(kind);
    await wb.xlsx.writeFile(OUT[kind]);
    console.log("✓ wrote", OUT[kind], "—", wb.worksheets.map((w) => w.name).filter((n) => n !== "_Lists").join(", "));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
