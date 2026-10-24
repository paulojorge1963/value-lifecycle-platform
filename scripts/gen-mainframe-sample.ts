/* Build a worked, importable SAMPLE for the Mainframe Modernisation profile —
 * a "Mainframe Value Assessment" for a fictitious insurer, with the BMC AMI
 * Product inventory filled. Generated from buildTemplate (the live structure)
 * then filled, so it imports cleanly. Vendor-neutral / illustrative figures.
 *
 *   npx tsx scripts/gen-mainframe-sample.ts
 */
import ExcelJS from "exceljs";
import { buildTemplate } from "../src/lib/import/templates";
import { INDUSTRY_PROFILES } from "../src/lib/domain/industries";

const OUT = "/Users/paul/Library/CloudStorage/OneDrive-BlueTurtleTechnologies/Sales Enablement/Value-Capture-Templates/SAMPLE-Mainframe-Value-Assessment-VE-Discovery.xlsx";
const PROFILE = INDUSTRY_PROFILES.find((p) => p.key === "mainframe_mod")!.name;
const PLAIN = { name: "Calibri", size: 10 } as const;
const _ = undefined;
const norm = (v: any) => String(v ?? "").trim().toLowerCase();

function ws(wb: ExcelJS.Workbook, n: string) { const w = wb.getWorksheet(n); if (!w) throw new Error(`no sheet ${n}`); return w; }
function setKV(w: ExcelJS.Worksheet, label: string, value: any) {
  for (let r = 1; r <= w.rowCount; r++) if (norm(w.getRow(r).getCell(1).value) === norm(label)) { w.getRow(r).getCell(2).value = value; return; }
  throw new Error(`KV not found: "${label}" on ${w.name}`);
}
function headerRow(w: ExcelJS.Worksheet, firstTwo: string[]) {
  for (let r = 1; r <= w.rowCount; r++) { let ok = true; for (let i = 0; i < firstTwo.length; i++) if (norm(w.getRow(r).getCell(i + 1).value) !== norm(firstTwo[i])) { ok = false; break; } if (ok) return r; }
  throw new Error(`header not found: ${firstTwo.join("|")} on ${w.name}`);
}
function writeTable(w: ExcelJS.Worksheet, firstTwo: string[], rows: any[][], width: number) {
  const hr = headerRow(w, firstTwo);
  rows.forEach((row, ri) => { const r = hr + 1 + ri; for (let ci = 0; ci < width; ci++) { const v = row[ci]; if (v === _) continue; const c = w.getRow(r).getCell(ci + 1); c.value = v === "" ? null : v; c.font = PLAIN; } });
}

async function main() {
  const wb = buildTemplate("VE");

  const eng = ws(wb, "1. Engagement");
  setKV(eng, "Client / account", "Continental Mutual (illustrative)");
  setKV(eng, "Opportunity name", "Mainframe value assessment");
  setKV(eng, "Solution profile", PROFILE);
  setKV(eng, "Study type", "Mainframe value assessment (what the mainframe delivers)");
  setKV(eng, "Study title (as it will appear in app)", "Continental Mutual — Mainframe Value Assessment");
  setKV(eng, "Value Engineer (owner)", "<Value Engineer>");
  setKV(eng, "Currency", "USD");
  setKV(eng, "Estimated value (optional)", 3200000);
  setKV(eng, "Meeting date(s)", "illustrative");
  setKV(eng, "Target decision date", "2026-12-15");

  const ori = ws(wb, "2. Orientation");
  setKV(ori, "Problem statement (1–2 lines)", "The IBM Z estate is business-critical but its value is unmeasured — rising MLC, a large undocumented COBOL portfolio, scarce ageing Z skills, and no clear view of which workloads still earn their keep.");
  setKV(ori, "Scope — IN", "Workload & application inventory, MIPS/MLC baseline, BMC AMI product usage, business-function mapping, disposition (7 Rs)");
  setKV(ori, "Scope — OUT", "Actual migration / refactoring delivery (follows as scoped engagements)");
  setKV(ori, "Target value outcome", "A validated value baseline, a workload disposition map, and a modernisation roadmap with a quantified business case.");
  setKV(ori, "Value hypothesis (rough size & driver)", "~$3.2M/yr addressable via MLC/R4HA reduction, orphaned-workload retirement and AMI automation — plus risk reduction on skills and resilience.");
  writeTable(ori, ["Name", "Role / title"], [
    ["Head of Z Platform", "Mainframe platform owner", "No", "MIPS, MSU, MLC, availability", "Champion"],
    ["CIO office", "Economic buyer", "Yes", "Budget & modernisation mandate", "Sponsor"],
    ["Application owners", "Business/IT", "No", "Workload business value", "Map workloads to functions"],
    ["Security & compliance lead", "Risk", "No", "Audit & compliance posture", "Security disposition"],
  ], 5);

  writeTable(ws(wb, "3. Baseline"), ["Item / metric", "Current value"], [
    ["Installed capacity", 4200, "MIPS", "Capacity report", "2026", "Across 6 LPARs", "High"],
    ["Peak R4HA", 850, "MSU", "SCRT / sub-capacity report", "2026 peak", "Sets the MLC bill", "High"],
    ["Annual MLC software cost", 2400000, "USD", "Invoices", "2026", "R4HA-based", "High"],
    ["Applications", 180, "count", "Portfolio inventory", "2026", "~12,000 COBOL programs", "Medium"],
    ["Batch window", 6, "hours", "Scheduler", "nightly", "Overnight close", "High"],
    ["Orphaned / inactive workloads", 12, "% of MIPS", "Usage analytics", "2026", "Retirement candidates", "Medium"],
    ["Z specialists", 14, "count", "HR / org", "2026", "35% contractors; avg tenure 18 yrs", "High"],
    ["Availability", 99.95, "%", "Ops reporting", "2026", "22 incidents/yr", "High"],
  ], 7);

  // AMI Product inventory (the new capture tab — capture-only, importer ignores)
  writeTable(ws(wb, "Product inventory"), ["Product / module", "Deployed?"], [
    ["BMC AMI Ops", "Yes", "Ops Monitor", "Monitors z/OS, CICS, Db2 performance & availability", "Ops team · reactive triage", "Medium", "Visibility into performance and incidents", "Not using automation/capping to cut R4HA peak"],
    ["BMC AMI DevX", "Partial", "Abend-AID, File-AID", "Fault diagnostics and test-data management", "Dev team · legacy debugging", "Low", "Faster fault analysis", "No Workbench/CI-CD or AI-augmented modernisation; COBOL undocumented"],
    ["BMC AMI Data", "Yes", "AMI for Db2", "Db2 performance, admin and recovery", "DBA team", "Medium", "Db2 availability & recovery", "IMS not covered; limited automation"],
    ["BMC AMI Security", "No", "", "Mainframe threat detection & compliance", "—", "Low", "—", "No mainframe-specific threat detection; manual RACF audits"],
    ["BMC AMI Cloud", "No", "", "Data/storage to cloud, air-gapped backup & DR", "—", "Low", "—", "Tape-based backup; no cyber-resilient air-gapped recovery"],
    ["BMC AMI Assistant & Agentics", "No", "", "Generative/agentic AI across the portfolio", "—", "Low", "—", "Not adopted — opportunity to offset scarce Z skills"],
  ], 8);

  writeTable(ws(wb, "4. Functions"), ["Verb", "Noun"], [
    ["Process", "transactions", "BASIC", 1200000, 1400000, _, _],
    ["Run", "batch", "BASIC", 900000, 950000, _, _],
    ["Manage", "data", "BASIC", 600000, 650000, _, _],
    ["Recover", "failures", "SECONDARY", 300000, 350000, _, _],
    ["Secure", "access", "SECONDARY", 250000, 400000, _, _],
    ["Maintain", "applications", "SECONDARY", 500000, 300000, _, _],
    ["Monitor", "operations", "SECONDARY", 350000, 300000, _, _],
  ], 7);

  writeTable(ws(wb, "5. Alternatives"), ["Idea", "Linked function (verb+noun)"], [
    ["Enable AMI Ops automation & capping", "Monitor operations", "Automate response and cap R4HA peak to cut MLC", 700000, "Yes"],
    ["Adopt AMI DevX (Workbench + CI/CD + AI)", "Maintain applications", "De-risk & accelerate COBOL change; onboard developers", 600000, "Yes"],
    ["Rationalise & retire orphaned workloads", "Run batch", "Retire inactive/low-value MIPS", 500000, "Yes"],
    ["Cyber-resilient backup/DR with AMI Cloud", "Recover failures", "Air-gapped immutable backups; remove tape", 400000, "Yes"],
    ["Deploy AMI Security", "Secure access", "Mainframe threat detection & continuous compliance", 300000, "Yes"],
    ["Do nothing (status quo)", "Maintain applications", "Keep running as-is", 0, "No"],
  ], 5);

  writeTable(ws(wb, "6. Evaluation"), ["Alternative", "Cost impact"], [
    ["Enable AMI Ops automation & capping", 5, 4, 4, 5, 5, _],
    ["Adopt AMI DevX (Workbench + CI/CD + AI)", 4, 5, 3, 4, 3, _],
    ["Rationalise & retire orphaned workloads", 5, 3, 3, 4, 4, _],
    ["Cyber-resilient backup/DR with AMI Cloud", 3, 4, 5, 4, 4, _],
    ["Deploy AMI Security", 2, 4, 5, 4, 4, _],
    ["Do nothing (status quo)", 1, 3, 2, 5, 5, _],
  ], 7);

  writeTable(ws(wb, "7. Recommendations"), ["Title", "Summary"], [
    ["Cut R4HA with AMI Ops automation & capping", "Automate operations and cap the R4HA peak to lower MLC.", "AMI Ops automation + intelligent capping against SCRT peak.", "Directly reduces the monthly software bill.", 700000, 150000, "ACCEPTED"],
    ["De-risk & accelerate apps with AMI DevX", "Modern IDE, CI/CD and AI-augmented COBOL modernisation.", "Workbench + Code Pipeline + AI code understanding/refactoring.", "Lowers change risk and skills dependency; speeds delivery.", 600000, 300000, "ACCEPTED"],
    ["Rationalise & retire orphaned workloads", "Retire inactive / low-value workloads found in the assessment.", "Confirm with usage analytics; decommission safely.", "Frees MIPS and removes maintenance cost.", 500000, 80000, "ACCEPTED"],
    ["Cyber-resilient backup/DR with AMI Cloud", "Air-gapped immutable backups and fast DR; remove tape.", "AMI Cloud data to cloud object storage.", "Cuts storage cost and strengthens cyber-resilience.", 400000, 250000, "ACCEPTED"],
  ], 7);

  const bc = ws(wb, "8. Business case");
  setKV(bc, "Currency", "USD");
  setKV(bc, "Discount rate", 0.1);
  setKV(bc, "Horizon (years)", 5);
  writeTable(bc, ["Label", "Kind"], [
    ["AMI automation & capping enablement", "ONE_OFF", "", 500000, 0, "No", _, _, _],
    ["AMI DevX rollout & enablement", "ONE_OFF", "", 900000, 0, "No", _, _, _],
    ["Modernisation & rationalisation services", "ONE_OFF", "", 600000, 0, "No", _, _, _],
    ["MLC / R4HA reduction", "BENEFIT", "COST_SAVING", 600000, "", "Yes", _, _, _],
    ["Orphaned-workload retirement", "BENEFIT", "COST_SAVING", 350000, "", "Yes", _, _, _],
    ["Developer productivity / skills-risk reduction", "BENEFIT", "TIME_SAVING", 300000, "", "Yes", _, _, _],
    ["Avoided tape & DR cost", "BENEFIT", "COST_SAVING", 200000, "", "Yes", _, _, _],
    ["BMC AMI subscription & support", "OPEX", "", 450000, "", "Yes", _, _, _],
  ], 9);

  const hp = ws(wb, "9. Handover pack");
  writeTable(hp, ["KPI (pick)", "KPI key (auto)"], [
    ["Peak R4HA (MSU)", "msu_r4ha_peak", 850, 720, "MSU", "monthly", "SCRT", "Platform"],
    ["MIPS consumed (installed capacity used)", "mips_capacity", 4200, 3700, "MIPS", "quarterly", "Usage analytics", "Platform"],
    ["Workloads mapped to business value", "workload_value_mapped", 40, 95, "%", "quarterly", "Assessment", "VRM"],
    ["Low-value / orphaned workloads", "low_value_workloads", 12, 3, "%", "quarterly", "Usage analytics", "Platform"],
    ["Portfolio dispositioned / modernisation-ready", "modernisation_readiness", 0, 80, "%", "quarterly", "Assessment", "VRM"],
  ], 8);
  writeTable(hp, ["Type", "Title"], [
    ["EXPECTED_BENEFIT", "MLC & capacity saving", "R4HA/capping reduction + orphaned-workload retirement", 1200000, "COST_SAVING"],
    ["EXPECTED_BENEFIT", "Skills-risk & delivery improvement", "AMI DevX lowers change risk and speeds delivery", "", "TIME_SAVING"],
    ["SUCCESS_CRITERION", "Every workload mapped to a function & disposition", "100% of workloads assigned a business value and a 7-Rs disposition", "", ""],
    ["BASELINE", "Estate baseline", "4,200 MIPS · 850 MSU peak · $2.4M MLC · 180 applications", "", ""],
  ], 5);

  writeTable(ws(wb, "10. Risks"), ["Risk / description", "Likelihood (1–5)"], [
    ["Scarce Z skills to execute the roadmap", 4, 4, _, "Use AMI DevX/Assistant to offset; partner with Blue Turtle delivery.", "OPEN"],
    ["Incomplete / undocumented application knowledge", 4, 3, _, "AI-augmented code analysis to rebuild documentation.", "OPEN"],
    ["Business resistance to retiring workloads", 3, 3, _, "Evidence-based disposition with owners; phased retirement.", "OPEN"],
  ], 6);

  await wb.xlsx.writeFile(OUT);
  console.log("wrote", OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
