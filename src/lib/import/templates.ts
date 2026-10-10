// Generates the capture workbooks (VE Discovery, VR Intake, CS Intake) served
// from the app's "download a blank template" links. The layout matches the
// Blue Turtle capture-workbook standard 1:1 (styled title + hint rows, yellow
// input cells, grey auto-formula cells, a blue table-header row and a greyed
// EXAMPLE row the importer skips, dropdowns backed by named ranges on a hidden
// "_Lists" sheet, plus a "Reference" catalogue and a "Read me").
//
// Every dropdown, KPI and profile prompt is sourced LIVE from the app domain
// (INDUSTRY_PROFILES, KPI_CATALOG, CURRENCIES, CS_STAGES, HEALTH_FACTORS), so a
// downloaded template can never drift from the app the way a hand-built one can.
import ExcelJS from "exceljs";
import { INDUSTRY_PROFILES } from "../domain/industries";
import { KPI_CATALOG } from "../domain/kpis";
import { CS_STAGES } from "../domain/cs-stages";
import { HEALTH_FACTORS } from "../domain/cs-health";
import { CURRENCIES } from "../finance";

export type TemplateKind = "VE" | "VR" | "CS";

// ── palette (ARGB) ────────────────────────────────────────────────────────
const HDR = "FF1E40AF";   // table header fill (blue)
const YEL = "FFFEF9C3";   // input cell (yellow)
const GRY = "FFF1F5F9";   // auto / computed cell (grey)
const WHT = "FFFFFFFF";
const TITLE = "FF1E3A8A";  // sheet title text (navy-blue)
const HINT = "FF64748B";   // italic hint
const EX = "FF94A3B8";     // greyed example text
const INKC = "FF0F172A";   // label text
const FONT = "Calibri";

// ── live pick-lists ─────────────────────────────────────────────────────────
const PROFILES = INDUSTRY_PROFILES.map((p) => p.name);
const STUDY_TYPES = Array.from(new Set(INDUSTRY_PROFILES.flatMap((p) => p.config.studyTypes))).sort();
const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
const KPI_NAMES = KPI_CATALOG.map((k) => k.name);
const KPI_END = 4 + KPI_CATALOG.length; // last row of the KPI block on the Reference sheet

// ── low-level cell helpers ───────────────────────────────────────────────────
function solid(argb: string) { return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } }; }
function setTitle(ws: ExcelJS.Worksheet, num: string, name: string, hint?: string) {
  const t = ws.getCell("A1"); t.value = `${num} · ${name}`;
  t.font = { name: FONT, bold: true, size: 15, color: { argb: TITLE } };
  if (hint) { const h = ws.getCell("A2"); h.value = hint; h.font = { name: FONT, italic: true, size: 10, color: { argb: HINT } }; }
}
function label(ws: ExcelJS.Worksheet, row: number, text: string) {
  const c = ws.getCell(`A${row}`); c.value = text; c.font = { name: FONT, bold: true, size: 11, color: { argb: INKC } };
}
function sub(ws: ExcelJS.Worksheet, row: number, text: string) {
  const c = ws.getCell(`A${row}`); c.value = text; c.font = { name: FONT, bold: true, size: 12, color: { argb: TITLE } };
}
function input(ws: ExcelJS.Worksheet, ref: string, opts: { dv?: string; value?: string | number } = {}) {
  const c = ws.getCell(ref);
  if (opts.value !== undefined) c.value = opts.value;
  c.fill = solid(YEL);
  if (opts.dv) c.dataValidation = { type: "list", allowBlank: true, formulae: [opts.dv] };
}
function auto(ws: ExcelJS.Worksheet, ref: string, formula: string) {
  const c = ws.getCell(ref); c.value = { formula }; c.fill = solid(GRY);
}
function headerRow(ws: ExcelJS.Worksheet, row: number, headers: string[]) {
  headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h; c.font = { name: FONT, bold: true, size: 10, color: { argb: WHT } };
    c.fill = solid(HDR); c.alignment = { vertical: "middle", wrapText: true };
  });
}
function exampleRow(ws: ExcelJS.Worksheet, row: number, values: (string | number | null)[]) {
  values.forEach((v, i) => {
    if (v === null || v === undefined) return;
    const c = ws.getCell(row, i + 1); c.value = v;
    c.font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  });
}
function dvRange(ws: ExcelJS.Worksheet, col: string, from: number, to: number, name: string) {
  for (let r = from; r <= to; r++) ws.getCell(`${col}${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [name] };
}
function widths(ws: ExcelJS.Worksheet, ...w: number[]) { w.forEach((x, i) => { ws.getColumn(i + 1).width = x; }); }

// ── hidden _Lists sheet + named ranges ───────────────────────────────────────
type ListDef = [string, string[]];
function buildLists(wb: ExcelJS.Workbook, defs: ListDef[]) {
  const ws = wb.addWorksheet("_Lists", { state: "hidden" });
  defs.forEach(([name, values], ci) => {
    const col = ci + 1;
    const letter = ws.getColumn(col).letter;
    ws.getCell(1, col).value = name;
    values.forEach((v, i) => { ws.getCell(i + 2, col).value = v; });
    wb.definedNames.add(`_Lists!$${letter}$2:$${letter}$${values.length + 1}`, name);
  });
}

// ── Reference sheet (KPI catalogue + per-profile prompts) ────────────────────
function buildReferenceVEVR(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Reference");
  widths(ws, 26, 40, 10, 18, 12, 16);
  setTitle(ws, "", "Reference — KPI catalogue & profile prompts".replace(/^ · /, ""));
  ws.getCell("A1").value = "Reference — KPI catalogue & profile prompts";
  ws.getCell("A2").value = "Pick-list prompts from the app. Use these to fill the dropdowns and shape the conversation.";
  ws.getCell("A2").font = { name: FONT, italic: true, size: 10, color: { argb: HINT } };
  headerRow(ws, 4, ["KPI key", "KPI name", "Unit", "Direction", "Discipline", "Category"]);
  KPI_CATALOG.forEach((k: any, i) => {
    const r = 5 + i;
    ws.getCell(`A${r}`).value = k.key;
    ws.getCell(`B${r}`).value = k.name;
    ws.getCell(`C${r}`).value = k.unit ?? "";
    ws.getCell(`D${r}`).value = k.direction ?? "";
    ws.getCell(`E${r}`).value = k.discipline ?? "";
    ws.getCell(`F${r}`).value = k.category ?? "";
  });
  let r = KPI_END + 2;
  sub(ws, r, "Per-solution-profile prompts (cost drivers · value levers · default KPIs)"); r += 1;
  INDUSTRY_PROFILES.forEach((p: any) => {
    r += 1; ws.getCell(`A${r}`).value = p.name; ws.getCell(`A${r}`).font = { name: FONT, bold: true, color: { argb: INKC } };
    const cfg = p.config ?? {};
    r += 1; label(ws, r, "Cost drivers"); ws.getCell(`B${r}`).value = (cfg.costDrivers ?? []).join(" · ");
    r += 1; label(ws, r, "Value levers"); ws.getCell(`B${r}`).value = (cfg.valueLevers ?? []).join(" · ");
    r += 1; label(ws, r, "Default KPIs"); ws.getCell(`B${r}`).value = (cfg.defaultKpiKeys ?? []).join(" · ");
  });
}
function buildReferenceCS(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Reference");
  widths(ws, 60);
  ws.getCell("A1").value = "Reference";
  ws.getCell("A1").font = { name: FONT, bold: true, size: 15, color: { argb: TITLE } };
  ws.getCell("A2").value = "Pick-list prompts from the app.";
  ws.getCell("A2").font = { name: FONT, italic: true, size: 10, color: { argb: HINT } };
  headerRow(ws, 4, ["Solution profiles"]);
  PROFILES.forEach((p, i) => { ws.getCell(`A${5 + i}`).value = p; });
  let r = 6 + PROFILES.length;
  sub(ws, r, "Health factors (weights)"); r += 1;
  HEALTH_FACTORS.forEach((f: any) => { ws.getCell(`A${r}`).value = `${f.label} (w${f.weight})`; r += 1; });
  r += 1; sub(ws, r, "CS lifecycle stages"); r += 1;
  CS_STAGES.forEach((s: any) => { ws.getCell(`A${r}`).value = s.description ? `${s.title} — ${s.description}` : s.title; r += 1; });
}

// ── Read me sheet ────────────────────────────────────────────────────────────
function buildReadme(wb: ExcelJS.Workbook, heading: string, intro: string, rows: [string, string][], tabMap: [string, string][]) {
  const ws = wb.addWorksheet("Read me"); widths(ws, 22, 92);
  ws.getCell("A1").value = heading; ws.getCell("A1").font = { name: FONT, bold: true, size: 15, color: { argb: TITLE } };
  ws.getCell("A2").value = intro; ws.getCell("A2").font = { name: FONT, italic: true, size: 10, color: { argb: HINT } };
  let r = 5;
  rows.forEach(([k, v]) => { label(ws, r, k); ws.getCell(`B${r}`).value = v; ws.getCell(`B${r}`).alignment = { wrapText: true }; r += 1; });
  r += 1; sub(ws, r, "Tab → App module"); r += 1;
  tabMap.forEach(([k, v]) => { label(ws, r, k); ws.getCell(`B${r}`).value = v; r += 1; });
}
const README_ROWS: [string, string][] = [
  ["Purpose", "Capture what you learn in client meetings, then transcribe into the app — or import this whole file."],
  ["Colour key", "Yellow cells = you fill in.   Grey cells = auto-calculated (don't type over them).   Header rows = fixed."],
  ["Dropdowns", "Cells with a dropdown use the app's own pick-lists (solution profiles, study types, KPIs, currencies, statuses) so entries match the system."],
  ["Example row", "The first data row of each table is a greyed-italic EXAMPLE of the format — overwrite it or delete it."],
  ["Provenance", "Wherever you record a number, capture its Source / Period / Assumption / Confidence."],
  ["Importing", "A study/track can be loaded straight from this file:  npx tsx scripts/import-workbook.ts <file>.xlsx  (add --dry-run to preview)."],
  ["Before you import", "Delete the greyed example row in each table (or add rows beneath it); keep the tab names and column headers unchanged."],
];

// ── VE ───────────────────────────────────────────────────────────────────────
function buildVE(wb: ExcelJS.Workbook) {
  buildReadme(wb, "Blue Turtle · VE Discovery Workbook — Read me",
    "How to use this workbook, and how each tab maps to the Value Lifecycle Platform.", README_ROWS,
    [["1. Engagement", "New VE study header"], ["2. Orientation", "Problem, scope, stakeholders, value hypothesis"],
     ["3. Baseline", "Current-state cost & pain (with sources)"], ["4. Functions", "Function analysis — verb/noun, cost, worth"],
     ["5. Alternatives", "Creative alternatives (linked to functions)"], ["6. Evaluation", "Evaluation matrix — criteria, weights, scores"],
     ["7. Recommendations", "Developed recommendations"], ["8. Business case", "Cost/benefit line items + ROI/payback/NPV"],
     ["9. Handover pack", "KPIs, baselines, success criteria, expected benefits"], ["10. Risks", "Study risk register"],
     ["Reference", "KPI catalogue + per-profile drivers & levers"]]);
  buildReferenceVEVR(wb);
  buildLists(wb, [
    ["SolutionProfiles", PROFILES], ["StudyTypes", STUDY_TYPES],
    ["CostItemKind", ["CAPEX", "OPEX", "ONE_OFF", "RECURRING", "BENEFIT"]],
    ["BenefitCategory", ["COST_SAVING", "REVENUE_UPLIFT", "RISK_REDUCTION", "TIME_SAVING", "QUALITY", "SCHEDULE", "RELIABILITY", "OTHER"]],
    ["FunctionKind", ["BASIC", "SECONDARY"]],
    ["RecommendationStatus", ["PROPOSED", "SHORTLISTED", "ACCEPTED", "REJECTED", "DEFERRED"]],
    ["YesNo", ["Yes", "No"]], ["Currencies", CURRENCY_CODES], ["KpiNames", KPI_NAMES],
    ["WorkPackageStatus", ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]],
    ["RiskStatus", ["OPEN", "MITIGATING", "CLOSED", "ACCEPTED"]],
    ["Health", ["GREEN", "AMBER", "RED"]], ["Confidence", ["High", "Medium", "Low"]],
    ["Scale", ["1", "2", "3", "4", "5"]],
    ["TrackOrigin", ["STANDALONE (existing software)", "VE_HANDOVER (from a study)"]],
    ["ArtifactType", ["EXPECTED_BENEFIT", "SUCCESS_CRITERION", "BASELINE", "KPI", "RISK"]],
    ["LessonCat", ["what_worked", "what_to_change", "recommendation_for_ve"]],
  ]);

  // 1. Engagement
  let ws = wb.addWorksheet("1. Engagement"); widths(ws, 42, 52, 26);
  setTitle(ws, "1", "Engagement", "New VE study header → maps to the app's New VE Study form.");
  const eng: [string, string?][] = [["Client / account"], ["Opportunity name"], ["Solution profile", "SolutionProfiles"],
    ["Study type", "StudyTypes"], ["Study title (as it will appear in app)"], ["Value Engineer (owner)"],
    ["Currency", "Currencies"], ["Estimated value (optional)"], ["Meeting date(s)"], ["Target decision date"]];
  eng.forEach(([lab, dv], i) => { const r = 4 + i; label(ws, r, lab); input(ws, `B${r}`, { dv }); });

  // 2. Orientation
  ws = wb.addWorksheet("2. Orientation"); widths(ws, 34, 28, 18, 28, 30);
  setTitle(ws, "2", "Orientation", "Problem, scope, stakeholders, value hypothesis.");
  ["Problem statement (1–2 lines)", "Scope — IN", "Scope — OUT", "Target value outcome", "Value hypothesis (rough size & driver)"]
    .forEach((l, i) => { label(ws, 4 + i, l); input(ws, `B${4 + i}`); });
  sub(ws, 10, "Stakeholders");
  headerRow(ws, 11, ["Name", "Role / title", "Economic buyer?", "Owns which numbers", "Notes"]);
  exampleRow(ws, 12, ["e.g. J. Dlamini", "Head of IT Ops", "No", "Incident & SLA data", "Sponsor is the CFO office"]);
  dvRange(ws, "C", 12, 22, "YesNo");

  // 3. Baseline
  ws = wb.addWorksheet("3. Baseline"); widths(ws, 30, 14, 12, 22, 12, 26, 12);
  setTitle(ws, "3", "Current-state baseline", "Information phase. Capture the number AND where it came from.");
  headerRow(ws, 4, ["Item / metric", "Current value", "Unit", "Source", "Period", "Assumption", "Confidence"]);
  exampleRow(ws, 5, ["Failed / rerun jobs", 120, "per month", "Control-M reports", "Q1 2026", "Steady-state monthly avg", "High"]);
  dvRange(ws, "G", 6, 25, "Confidence");

  // 4. Functions
  ws = wb.addWorksheet("4. Functions"); widths(ws, 22, 22, 14, 14, 14, 16, 34);
  setTitle(ws, "4", "Function analysis", "Verb + noun. Value index = worth ÷ cost (auto).");
  headerRow(ws, 4, ["Verb", "Noun", "Kind", "Cost", "Worth", "Value index (auto)", "Supports (why) →"]);
  exampleRow(ws, 5, ["Orchestrate", "workloads", "BASIC", 420000, 300000]);
  for (let r = 5; r <= 20; r++) auto(ws, `F${r}`, `IFERROR(E${r}/D${r},"")`);
  dvRange(ws, "C", 5, 20, "FunctionKind");

  // 5. Alternatives
  ws = wb.addWorksheet("5. Alternatives"); widths(ws, 34, 26, 30, 14, 14);
  setTitle(ws, "5", "Creative alternatives", "Ideas for the high-value functions. Shortlist the ones worth evaluating.");
  headerRow(ws, 4, ["Idea", "Linked function (verb+noun)", "Description", "Rough value", "Shortlisted?"]);
  exampleRow(ws, 5, ["Consolidate schedulers onto Control-M", "Orchestrate workloads", "Retire 3 legacy schedulers", 780000, "Yes"]);
  dvRange(ws, "E", 5, 20, "YesNo");

  // 6. Evaluation
  ws = wb.addWorksheet("6. Evaluation"); widths(ws, 30, 14, 12, 12, 12, 12, 16);
  setTitle(ws, "6", "Evaluation matrix", "Weight the criteria (total 100%), score each alternative 1–5 (auto-weighted).");
  sub(ws, 4, "Criteria & weights"); headerRow(ws, 5, ["Criterion", "Weight %"]);
  [["Cost impact", 0.2], ["Performance", 0.2], ["Risk", 0.2], ["Feasibility", 0.2], ["Schedule", 0.2]]
    .forEach(([c, w], i) => { label(ws, 6 + i, c as string); input(ws, `B${6 + i}`, { value: w as number }); });
  label(ws, 11, "Total"); auto(ws, "B11", "SUM(B6:B10)");
  sub(ws, 13, "Score each alternative (1–5)");
  headerRow(ws, 14, ["Alternative", "Cost impact", "Performance", "Risk", "Feasibility", "Schedule", "Weighted score (auto)"]);
  exampleRow(ws, 15, ["Consolidate on Control-M", 4, 4, 4, 4, 4]);
  for (let r = 15; r <= 22; r++) auto(ws, `G${r}`, `IF(COUNT(B${r}:F${r})=0,"",B${r}*$B$6+C${r}*$B$7+D${r}*$B$8+E${r}*$B$9+F${r}*$B$10)`);
  dvRange(ws, "B", 15, 22, "Scale"); dvRange(ws, "C", 15, 22, "Scale"); dvRange(ws, "D", 15, 22, "Scale");
  dvRange(ws, "E", 15, 22, "Scale"); dvRange(ws, "F", 15, 22, "Scale");

  // 7. Recommendations
  ws = wb.addWorksheet("7. Recommendations"); widths(ws, 34, 30, 26, 26, 12, 12, 14);
  setTitle(ws, "7", "Recommendations", "Developed recs. Status ACCEPTED is the guard for handover.");
  headerRow(ws, 4, ["Title", "Summary", "Technical detail", "Commercial detail", "Est. value", "Est. cost", "Status"]);
  exampleRow(ws, 5, ["Consolidate schedulers onto Control-M", "Retire 3 legacy schedulers; orchestrate on Control-M", "Migrate AutoSys+cron+legacy", "Removes licences + rerun effort", 780000, 60000, "ACCEPTED"]);
  dvRange(ws, "G", 5, 18, "RecommendationStatus");

  // 8. Business case
  ws = wb.addWorksheet("8. Business case"); widths(ws, 34, 14, 16, 14, 12, 12, 18, 18, 16);
  setTitle(ws, "8", "Business case", "Cost/benefit line items → the app's business case. Finance below mirrors the app's engine (indicative).");
  sub(ws, 4, "Assumptions");
  label(ws, 5, "Currency"); input(ws, "B5", { dv: "Currencies" });
  label(ws, 6, "Discount rate"); input(ws, "B6", { value: 0.08 });
  label(ws, 7, "Horizon (years)"); input(ws, "B7", { value: 5 });
  sub(ws, 9, "Cost / benefit line items");
  headerRow(ws, 10, ["Label", "Kind", "Category", "Amount", "Year (0=now)", "Recurring?", "Investment y0 (auto)", "Annual benefit (auto)", "Annual opex (auto)"]);
  exampleRow(ws, 11, ["Legacy scheduler licence takeout", "BENEFIT", "COST_SAVING", 950000, null, "Yes"]);
  for (let r = 11; r <= 24; r++) {
    auto(ws, `G${r}`, `IF(AND(OR(B${r}="CAPEX",B${r}="ONE_OFF"),N(E${r})=0),D${r},0)`);
    auto(ws, `H${r}`, `IF(AND(B${r}="BENEFIT",F${r}="Yes"),D${r},0)`);
    auto(ws, `I${r}`, `IF(OR(B${r}="OPEX",B${r}="RECURRING"),D${r},0)`);
  }
  dvRange(ws, "B", 11, 24, "CostItemKind"); dvRange(ws, "C", 11, 24, "BenefitCategory"); dvRange(ws, "F", 11, 24, "YesNo");
  label(ws, 25, "Totals"); auto(ws, "G25", "SUM(G11:G24)"); auto(ws, "H25", "SUM(H11:H24)"); auto(ws, "I25", "SUM(I11:I24)");
  sub(ws, 27, "Results (indicative — the app is the source of truth)");
  label(ws, 28, "Total investment"); auto(ws, "B28", "$G$25");
  label(ws, 29, "Annual net benefit"); auto(ws, "B29", "$H$25-$I$25");
  label(ws, 30, "ROI over horizon"); auto(ws, "B30", 'IF($G$25=0,"",($B$29*$B$7-$G$25)/$G$25)');
  label(ws, 31, "Payback (months)"); auto(ws, "B31", 'IF($B$29<=0,"",$G$25/$B$29*12)');
  ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5"].forEach((y, i) => { const c = ws.getCell(32, 2 + i); c.value = y; c.font = { name: FONT, italic: true, size: 10, color: { argb: EX } }; });
  label(ws, 33, "Net cash flow by year");
  auto(ws, "B33", "-$G$25");
  [1, 2, 3, 4, 5].forEach((n, i) => auto(ws, `${String.fromCharCode(67 + i)}33`, `IF(${n}<=$B$7,$B$29,0)`));
  label(ws, 35, "NPV @ discount"); auto(ws, "B35", "B33+NPV($B$6,C33:G33)");
  label(ws, 36, "IRR"); auto(ws, "B36", 'IFERROR(IRR(B33:G33),"n/a")');

  // 9. Handover pack
  ws = wb.addWorksheet("9. Handover pack"); widths(ws, 30, 22, 12, 12, 12, 14, 20, 16);
  setTitle(ws, "9", "Handover pack", "KPI definitions, baselines, success criteria, expected benefits handed to Value Realisation.");
  sub(ws, 4, "KPIs & baselines");
  headerRow(ws, 5, ["KPI (pick)", "KPI key (auto)", "Baseline", "Target", "Unit (auto)", "Frequency", "Data source", "Owner"]);
  ws.getCell("A6").value = "SLA attainment"; ws.getCell("A6").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  for (let r = 6; r <= 15; r++) {
    auto(ws, `B${r}`, `IFERROR(INDEX(Reference!$A$5:$A$${KPI_END},MATCH(A${r},Reference!$B$5:$B$${KPI_END},0)),"")`);
    auto(ws, `E${r}`, `IFERROR(INDEX(Reference!$C$5:$C$${KPI_END},MATCH(A${r},Reference!$B$5:$B$${KPI_END},0)),"")`);
  }
  dvRange(ws, "A", 6, 15, "KpiNames");
  sub(ws, 18, "Success criteria & expected benefits");
  headerRow(ws, 19, ["Type", "Title", "Detail", "Planned value", "Category"]);
  ws.getCell("A20").value = "EXPECTED_BENEFIT"; ws.getCell("A20").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  dvRange(ws, "A", 20, 27, "ArtifactType"); dvRange(ws, "E", 20, 27, "BenefitCategory");

  // 10. Risks
  ws = wb.addWorksheet("10. Risks"); widths(ws, 40, 14, 12, 12, 34, 14);
  setTitle(ws, "10", "Risk register", "Risks to the value case.");
  headerRow(ws, 4, ["Risk / description", "Likelihood (1–5)", "Impact (1–5)", "Score (auto)", "Mitigation", "Status"]);
  ws.getCell("A5").value = "Migration cutover disruption"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  for (let r = 5; r <= 17; r++) auto(ws, `D${r}`, `IFERROR(B${r}*C${r},"")`);
  dvRange(ws, "B", 5, 17, "Scale"); dvRange(ws, "C", 5, 17, "Scale"); dvRange(ws, "F", 5, 17, "RiskStatus");
}

// ── VR ───────────────────────────────────────────────────────────────────────
function buildVR(wb: ExcelJS.Workbook) {
  buildReadme(wb, "Blue Turtle · VR Intake Workbook — Read me",
    "How to use this workbook, and how each tab maps to the Value Lifecycle Platform.", README_ROWS,
    [["1. Track", "Realisation track header (origin, objectives, planned value)"], ["2. Baselines", "Validate/establish KPI baselines"],
     ["3. Work packages", "Work packages"], ["4. Adoption plan", "Adoption plan activities"], ["5. KPI tracker", "KPI targets + actuals by period"],
     ["6. Benefits", "Benefits — planned vs realized"], ["7. Risks & issues", "Track risk/issue register"], ["8. QBR notes", "Quarterly value review notes"],
     ["9. Lessons", "Lessons learned"], ["Reference", "KPI catalogue + per-profile drivers & levers"]]);
  buildReferenceVEVR(wb);
  buildLists(wb, [
    ["SolutionProfiles", PROFILES], ["StudyTypes", STUDY_TYPES],
    ["CostItemKind", ["CAPEX", "OPEX", "ONE_OFF", "RECURRING", "BENEFIT"]],
    ["BenefitCategory", ["COST_SAVING", "REVENUE_UPLIFT", "RISK_REDUCTION", "TIME_SAVING", "QUALITY", "SCHEDULE", "RELIABILITY", "OTHER"]],
    ["FunctionKind", ["BASIC", "SECONDARY"]],
    ["RecommendationStatus", ["PROPOSED", "SHORTLISTED", "ACCEPTED", "REJECTED", "DEFERRED"]],
    ["YesNo", ["Yes", "No"]], ["Currencies", CURRENCY_CODES], ["KpiNames", KPI_NAMES],
    ["WorkPackageStatus", ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]],
    ["RiskStatus", ["OPEN", "MITIGATING", "CLOSED", "ACCEPTED"]],
    ["Health", ["GREEN", "AMBER", "RED"]], ["Confidence", ["High", "Medium", "Low"]],
    ["Scale", ["1", "2", "3", "4", "5"]],
    ["TrackOrigin", ["STANDALONE (existing software)", "VE_HANDOVER (from a study)"]],
    ["ArtifactType", ["EXPECTED_BENEFIT", "SUCCESS_CRITERION", "BASELINE", "KPI", "RISK"]],
    ["LessonCat", ["what_worked", "what_to_change", "recommendation_for_ve"]],
  ]);

  // 1. Track
  let ws = wb.addWorksheet("1. Track"); widths(ws, 42, 52, 26);
  setTitle(ws, "1", "Track", "Realisation track header → maps to the app's New realisation track (or the VE → VR handover).");
  const tk: [string, string?, (string | number)?][] = [["Client / account"], ["Track title"], ["Origin", "TrackOrigin"],
    ["Source study code (if handover)"], ["Solution profile", "SolutionProfiles"], ["VRM (owner)"], ["Objectives"],
    ["Success criteria"], ["Planned value"], ["Currency", "Currencies"], ["Start date"], ["Target date"]];
  tk.forEach(([lab, dv], i) => { const r = 4 + i; label(ws, r, lab as string); input(ws, `B${r}`, { dv: dv as string | undefined }); });

  // 2. Baselines
  ws = wb.addWorksheet("2. Baselines"); widths(ws, 30, 22, 14, 12, 22, 14, 16, 22);
  setTitle(ws, "2", "Baseline & measurement", "Validate baselines (handover) or establish them from the live deployment (standalone).");
  headerRow(ws, 4, ["KPI (pick)", "KPI key (auto)", "Baseline value", "Unit (auto)", "Data source", "Frequency", "Owner", "Validated / established?"]);
  ws.getCell("A5").value = "MTTR"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  for (let r = 5; r <= 16; r++) {
    auto(ws, `B${r}`, `IFERROR(INDEX(Reference!$A$5:$A$${KPI_END},MATCH(A${r},Reference!$B$5:$B$${KPI_END},0)),"")`);
    auto(ws, `D${r}`, `IFERROR(INDEX(Reference!$C$5:$C$${KPI_END},MATCH(A${r},Reference!$B$5:$B$${KPI_END},0)),"")`);
  }
  dvRange(ws, "A", 5, 16, "KpiNames"); dvRange(ws, "H", 5, 16, "YesNo");

  // 3. Work packages
  ws = wb.addWorksheet("3. Work packages"); widths(ws, 34, 34, 18, 12, 12, 16);
  setTitle(ws, "3", "Work packages", "From accepted recommendations, or defined directly for a standalone track.");
  headerRow(ws, 4, ["Name", "Description", "Owner", "Start", "Due", "Status"]);
  ws.getCell("A5").value = "Implement: consolidate schedulers"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  dvRange(ws, "F", 5, 19, "WorkPackageStatus");

  // 4. Adoption plan
  ws = wb.addWorksheet("4. Adoption plan"); widths(ws, 34, 30, 18, 12, 16);
  setTitle(ws, "4", "Adoption plan", "Who's impacted, training, comms, champions — value comes from use.");
  headerRow(ws, 4, ["Activity", "Audience / who's impacted", "Owner", "Due", "Status"]);
  ws.getCell("A5").value = "Jobs-as-code training for ops"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  dvRange(ws, "E", 5, 17, "WorkPackageStatus");

  // 5. KPI tracker
  ws = wb.addWorksheet("5. KPI tracker"); widths(ws, 30, 22, 12, 12, 12, 14, 12, 18);
  setTitle(ws, "5", "KPI tracker", "Targets + actuals by period. Attainment auto-calcs vs baseline → target.");
  headerRow(ws, 4, ["KPI (pick)", "KPI key (auto)", "Baseline", "Target", "Unit (auto)", "Period", "Actual", "Attainment % (auto)"]);
  ws.getCell("A5").value = "SLA attainment"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  for (let r = 5; r <= 19; r++) {
    auto(ws, `B${r}`, `IFERROR(INDEX(Reference!$A$5:$A$${KPI_END},MATCH(A${r},Reference!$B$5:$B$${KPI_END},0)),"")`);
    auto(ws, `E${r}`, `IFERROR(INDEX(Reference!$C$5:$C$${KPI_END},MATCH(A${r},Reference!$B$5:$B$${KPI_END},0)),"")`);
    auto(ws, `H${r}`, `IFERROR((G${r}-C${r})/(D${r}-C${r}),"")`);
  }
  dvRange(ws, "A", 5, 19, "KpiNames");

  // 6. Benefits
  ws = wb.addWorksheet("6. Benefits"); widths(ws, 34, 16, 14, 14, 14);
  setTitle(ws, "6", "Benefits — planned vs realized", "Realized rolls up to the track & portfolio in the app.");
  headerRow(ws, 4, ["Benefit", "Category", "Planned value", "Realized value", "Variance (auto)"]);
  ws.getCell("A5").value = "Licence + rerun saving"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  for (let r = 5; r <= 17; r++) auto(ws, `E${r}`, `IFERROR(D${r}-C${r},"")`);
  dvRange(ws, "B", 5, 17, "BenefitCategory");

  // 7. Risks & issues
  ws = wb.addWorksheet("7. Risks & issues"); widths(ws, 40, 14, 12, 12, 34, 14);
  setTitle(ws, "7", "Risks & issues", "Risks to realizing value.");
  headerRow(ws, 4, ["Risk / issue", "Likelihood (1–5)", "Impact (1–5)", "Score (auto)", "Mitigation", "Status"]);
  ws.getCell("A5").value = "Adoption lag in ops team"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  for (let r = 5; r <= 17; r++) auto(ws, `D${r}`, `IFERROR(B${r}*C${r},"")`);
  dvRange(ws, "B", 5, 17, "Scale"); dvRange(ws, "C", 5, 17, "Scale"); dvRange(ws, "F", 5, 17, "RiskStatus");

  // 8. QBR notes
  ws = wb.addWorksheet("8. QBR notes"); widths(ws, 34, 60);
  setTitle(ws, "8", "QBR / value review notes", "Reconcile realized value vs the business case.");
  ["Review date", "Attendees", "Realized vs planned (summary)", "Wins", "Risks / blockers", "Renewal / expansion signal", "Actions & owners"]
    .forEach((l, i) => { label(ws, 4 + i, l); input(ws, `B${4 + i}`); });

  // 9. Lessons
  ws = wb.addWorksheet("9. Lessons"); widths(ws, 26, 40, 40);
  setTitle(ws, "9", "Lessons learned", "Feed improvements back into the VE templates & playbooks.");
  headerRow(ws, 4, ["Category", "Lesson", "Recommendation for next time"]);
  ws.getCell("A5").value = "what_worked"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  dvRange(ws, "A", 5, 15, "LessonCat");
}

// ── CS ───────────────────────────────────────────────────────────────────────
function buildCS(wb: ExcelJS.Workbook) {
  buildReadme(wb, "Blue Turtle · CS Intake Workbook — Read me",
    "Capture a Customer Success engagement, then import it into the Value Lifecycle Platform.",
    [["Purpose", "Capture a CS engagement from a meeting, then bulk-import into the app."],
     ["Colour key", "Yellow = you fill in.  Grey = auto / pre-listed.  Header rows = fixed."],
     ["Dropdowns", "Solution profile, status, sentiment, stage status and action status use the app's own pick-lists."],
     ["Health", "Enter each factor 0–100 on tab 5; the overall score and RAG band are computed on import."],
     ["Links", "On tab 9, enter existing VE/VR codes to attach them to this engagement."],
     ["Importing", "npx tsx scripts/import-workbook.ts <file>.xlsx  — add --dry-run to preview."],
     ["Before you import", "Delete greyed example rows (or add rows beneath them); keep tab names & headers unchanged."]],
    [["1. Account", "New engagement header"], ["2. Success plan", "Success plan at handover"], ["3. Lifecycle", "Status of the 8 CS stages"],
     ["4. Stakeholders", "Stakeholder map"], ["5. Health", "Health scorecard (0–100 per factor)"], ["6. Actions", "Governance action log"],
     ["7. Renewal", "Renewal plan"], ["8. Growth", "Expansion / growth plan"], ["9. Links", "Link existing VE studies & VR tracks"],
     ["Reference", "Profiles, health factors & lifecycle stages"]]);
  buildReferenceCS(wb);
  buildLists(wb, [
    ["SolutionProfiles", PROFILES], ["Currencies", CURRENCY_CODES],
    ["CsStatus", ["ACTIVE", "AT_RISK", "RENEWED", "CHURNED", "ARCHIVED"]],
    ["StageStatus", ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE"]],
    ["Sentiment", ["PROMOTER", "NEUTRAL", "DETRACTOR"]],
    ["ActionStatus", ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"]],
    ["Scale", ["1", "2", "3", "4", "5"]],
  ]);

  // 1. Account
  let ws = wb.addWorksheet("1. Account"); widths(ws, 42, 52, 26);
  setTitle(ws, "1", "Account & engagement", "New CS engagement header → maps to the app's New engagement form.");
  const acc: [string, string?][] = [["Account / customer"], ["Solution profile", "SolutionProfiles"], ["CSM (owner)"],
    ["Currency", "Currencies"], ["ARR"], ["Status", "CsStatus"], ["Renewal date"], ["Start date"], ["Objectives"]];
  acc.forEach(([lab, dv], i) => { const r = 4 + i; label(ws, r, lab); input(ws, `B${r}`, { dv }); });

  // 2. Success plan
  ws = wb.addWorksheet("2. Success plan"); widths(ws, 30, 60);
  setTitle(ws, "2", "Customer Success Plan", "The success plan captured at handover.");
  ["Success criteria", "Commitments", "Notes"].forEach((l, i) => { label(ws, 4 + i, l); input(ws, `B${4 + i}`); });

  // 3. Lifecycle
  ws = wb.addWorksheet("3. Lifecycle"); widths(ws, 30, 20, 40);
  setTitle(ws, "3", "Lifecycle stages", "Set the status of each of the 8 CS stages.");
  headerRow(ws, 4, ["Stage", "Status"]);
  CS_STAGES.forEach((s: any, i) => { const r = 5 + i; label(ws, r, s.title); input(ws, `B${r}`, { dv: "StageStatus", value: "NOT_STARTED" }); });

  // 4. Stakeholders
  ws = wb.addWorksheet("4. Stakeholders"); widths(ws, 24, 22, 20, 14, 14, 30);
  setTitle(ws, "4", "Stakeholder Map", "Influence × sentiment across the relationship.");
  headerRow(ws, 4, ["Name", "Title", "Role", "Influence (1–5)", "Sentiment", "Notes"]);
  exampleRow(ws, 5, ["e.g. T. Mokoena", "Head of IT Ops", "Champion", 5, "PROMOTER", "Sponsor's deputy"]);
  dvRange(ws, "D", 6, 17, "Scale"); dvRange(ws, "E", 6, 17, "Sentiment");

  // 5. Health
  ws = wb.addWorksheet("5. Health"); widths(ws, 30, 16);
  setTitle(ws, "5", "Health Scorecard", "Score each factor 0–100. Overall & RAG are computed on import.");
  label(ws, 4, "Period label"); input(ws, "B4", { value: "2026-Q4" });
  label(ws, 5, "Note"); input(ws, "B5");
  headerRow(ws, 7, ["Factor", "Score (0–100)"]);
  HEALTH_FACTORS.forEach((f: any, i) => { const r = 8 + i; label(ws, r, f.label); input(ws, `B${r}`, { value: 70 }); });

  // 6. Actions
  ws = wb.addWorksheet("6. Actions"); widths(ws, 40, 22, 14, 14);
  setTitle(ws, "6", "Action Log", "Governance actions & commitments.");
  headerRow(ws, 4, ["Title", "Owner", "Due", "Status"]);
  exampleRow(ws, 5, ["e.g. Book renewal EBR", "Thabo Nkosi", "2026-10-15", "OPEN"]);
  dvRange(ws, "D", 6, 17, "ActionStatus");

  // 7. Renewal
  ws = wb.addWorksheet("7. Renewal"); widths(ws, 30, 60);
  setTitle(ws, "7", "Renewal Plan", "");
  ["Renewal date", "Stage", "Value summary", "Risks", "Procurement status", "Planned actions"]
    .forEach((l, i) => { label(ws, 4 + i, l); input(ws, `B${4 + i}`); });

  // 8. Growth
  ws = wb.addWorksheet("8. Growth"); widths(ws, 30, 60);
  setTitle(ws, "8", "Growth Plan", "");
  ["Triggers", "Target value", "Narrative"].forEach((l, i) => { label(ws, 4 + i, l); input(ws, `B${4 + i}`); });

  // 9. Links
  ws = wb.addWorksheet("9. Links"); widths(ws, 24);
  setTitle(ws, "9", "Link existing studies & tracks", "Enter the code of an existing VE study / VR track to link it to this engagement.");
  headerRow(ws, 4, ["VE study code"]);
  ws.getCell("A5").value = "e.g. VE-2026-014"; ws.getCell("A5").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
  headerRow(ws, 13, ["VR track code"]);
  ws.getCell("A14").value = "e.g. VR-2026-014"; ws.getCell("A14").font = { name: FONT, italic: true, size: 10, color: { argb: EX } };
}

export function buildTemplate(kind: TemplateKind): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Value Lifecycle Platform";
  wb.created = new Date();
  if (kind === "VE") buildVE(wb);
  else if (kind === "VR") buildVR(wb);
  else buildCS(wb);
  return wb;
}
