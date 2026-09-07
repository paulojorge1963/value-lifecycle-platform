// Generates blank capture workbooks (VE Discovery, VR Intake, CS Intake) whose
// tabs/columns exactly match what workbook-import.ts reads. Example rows are
// italic (skipped on import). Dropdowns are backed by a hidden "_lists" sheet.
// Borrowed from the SN Edition and extended to cover Customer Success.
import ExcelJS from "exceljs";
import { INDUSTRY_PROFILES } from "../domain/industries";
import { KPI_CATALOG } from "../domain/kpis";
import { CS_STAGES } from "../domain/cs-stages";
import { HEALTH_FACTORS } from "../domain/cs-health";

export type TemplateKind = "VE" | "VR" | "CS";

const HEAD_FILL = "FF0F1E2B"; // graphite navy — matches the app's left rail
const EX_ITALIC = { italic: true, color: { argb: "FF94A3B8" } };

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } }; });
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

export function buildTemplate(kind: TemplateKind): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Value Lifecycle Platform";
  wb.created = new Date();

  // Hidden lookup lists for dropdowns.
  const lists = wb.addWorksheet("_lists", { state: "veryHidden" });
  const listCol: Record<string, string> = {};
  let col = 1;
  const addList = (name: string, values: string[]) => {
    const letter = colLetter(col);
    lists.getCell(`${letter}1`).value = name;
    values.forEach((v, i) => (lists.getCell(`${letter}${i + 2}`).value = v));
    listCol[name] = `_lists!$${letter}$2:$${letter}$${values.length + 1}`;
    col++;
  };
  addList("profiles", INDUSTRY_PROFILES.map((i) => i.name));
  addList("kpis", KPI_CATALOG.map((k) => k.name));
  addList("yesno", ["yes", "no"]);
  addList("fnkind", ["Basic", "Secondary"]);
  addList("costkind", ["CAPEX", "OPEX", "ONE_OFF", "RECURRING", "BENEFIT"]);
  addList("category", ["COST_SAVING", "REVENUE_UPLIFT", "RISK_REDUCTION", "TIME_SAVING", "QUALITY", "SCHEDULE", "RELIABILITY", "OTHER"]);
  addList("recstatus", ["PROPOSED", "SHORTLISTED", "ACCEPTED", "REJECTED", "DEFERRED"]);
  addList("riskstatus", ["OPEN", "MITIGATING", "CLOSED", "ACCEPTED"]);
  addList("wpstatus", ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]);
  addList("stagestatus", ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE"]);
  addList("actionstatus", ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"]);
  addList("engstatus", ["ACTIVE", "AT_RISK", "RENEWED", "CHURNED", "ARCHIVED"]);
  addList("sentiment", ["PROMOTER", "NEUTRAL", "DETRACTOR"]);
  addList("hoType", ["EXPECTED_BENEFIT", "KPI", "BASELINE", "MEASUREMENT_PLAN", "SUCCESS_CRITERION", "RISK"]);
  addList("origin", ["Handover from VE study", "Standalone"]);

  const dv = (ws: ExcelJS.Worksheet, colIdx: number, listName: string, fromRow: number, toRow = fromRow + 50) => {
    for (let r = fromRow; r <= toRow; r++) {
      ws.getCell(r, colIdx).dataValidation = { type: "list", allowBlank: true, formulae: [listCol[listName]] };
    }
  };

  // A label/value sheet (key in col A, filled by the user in col B, hint in col C).
  const kvSheet = (name: string, rows: [string, string?][], widthA = 42) => {
    const ws = wb.addWorksheet(name);
    ws.getColumn(1).width = widthA;
    ws.getColumn(2).width = 48;
    ws.getColumn(3).width = 28;
    rows.forEach(([label, hint]) => {
      const r = ws.addRow([label, ""]);
      r.getCell(1).font = { bold: true };
      if (hint) { r.getCell(3).value = hint; r.getCell(3).font = { italic: true, color: { argb: "FF94A3B8" } }; }
    });
    return ws;
  };
  // A table: bold header row + one italic example row (skipped on import).
  const table = (ws: ExcelJS.Worksheet, headers: string[], example: string[]) => {
    const hr = ws.addRow(headers);
    styleHeader(hr);
    const ex = ws.addRow(example);
    ex.eachCell((c) => (c.font = EX_ITALIC));
    headers.forEach((_, i) => { const w = ws.getColumn(i + 1).width ?? 0; ws.getColumn(i + 1).width = Math.max(w, Math.min(40, Math.max(14, headers[i].length + 2))); });
    return hr.number;
  };

  if (kind === "VE") {
    kvSheet("1. Engagement", [
      ["Study title (as it will appear in app)", "Free text"],
      ["Solution profile", "Pick from list"],
      ["Study type", ""],
      ["Currency", "e.g. USD"],
      ["Estimated value (optional)", "Number"],
      ["Target decision date", "Date"],
    ]);
    {
      const ws = wb.getWorksheet("1. Engagement")!;
      ws.getCell("B2").dataValidation = { type: "list", allowBlank: true, formulae: [listCol["profiles"]] };
    }

    const ori = kvSheet("2. Orientation", [
      ["Problem statement (1–2 lines)", ""],
      ["Value hypothesis (rough size & driver)", ""],
      ["Scope — IN", ""],
      ["Scope — OUT", ""],
    ]);
    ori.addRow([]);
    const oriHr = table(ori, ["Name", "Role / title", "Economic buyer?", "Owns which numbers", "Notes"], ["e.g. J. Dlamini", "COO", "yes", "Ops budget", ""]);
    dv(ori, 3, "yesno", oriHr + 1);

    const base = wb.addWorksheet("3. Baseline");
    table(base, ["Item / metric", "Current value", "Unit", "Source", "Period", "Assumption", "Confidence"], ["Failed / rerun jobs", "1200", "jobs/mo", "Ops report", "FY25", "steady", "med"]);

    const fns = wb.addWorksheet("4. Functions");
    const fnHr = table(fns, ["Verb", "Noun", "Kind", "Cost", "Worth"], ["Orchestrate", "Workflows", "Basic", "3200000", "2600000"]);
    dv(fns, 3, "fnkind", fnHr + 1);

    const alt = wb.addWorksheet("5. Alternatives");
    const altHr = table(alt, ["Idea", "Linked function (verb+noun)", "Description", "Rough value", "Shortlisted?"], ["Consolidate schedulers onto Control-M", "Orchestrate Workflows", "Single control plane", "3200000", "yes"]);
    dv(alt, 5, "yesno", altHr + 1);

    const ev = wb.addWorksheet("6. Evaluation");
    table(ev, ["Criterion", "Weight %"], ["Cost", "30"]);
    ev.addRow(["Benefit", "30"]).eachCell((c) => (c.font = EX_ITALIC));
    ev.addRow(["Feasibility", "20"]).eachCell((c) => (c.font = EX_ITALIC));
    ev.addRow(["Risk", "20"]).eachCell((c) => (c.font = EX_ITALIC));
    ev.addRow([]);
    table(ev, ["Alternative", "Cost", "Benefit", "Feasibility", "Risk"], ["Consolidate on Control-M", "4", "5", "4", "3"]);

    const rec = wb.addWorksheet("7. Recommendations");
    const recHr = table(rec, ["Title", "Summary", "Technical detail", "Commercial detail", "Est. value", "Est. cost", "Status"], ["Consolidate schedulers onto Control-M", "Single control plane", "Migrate jobs", "Licence takeout", "3200000", "900000", "PROPOSED"]);
    dv(rec, 7, "recstatus", recHr + 1);

    const bc = kvSheet("8. Business case", [["Discount rate", "e.g. 0.10 or 10"], ["Horizon (years)", "e.g. 3"]]);
    bc.addRow([]);
    const bcHr = table(bc, ["Label", "Kind", "Category", "Amount", "Year (0=now)", "Recurring?"], ["Legacy scheduler licence takeout", "BENEFIT", "COST_SAVING", "1800000", "0", "yes"]);
    dv(bc, 2, "costkind", bcHr + 1);
    dv(bc, 3, "category", bcHr + 1);
    dv(bc, 6, "yesno", bcHr + 1);

    const ho = wb.addWorksheet("9. Handover pack");
    const kpiHr = table(ho, ["KPI (pick)", "KPI key (auto)", "Baseline", "Target", "Unit (auto)", "Frequency", "Data source", "Owner"], ["SLA attainment", "sla_attainment", "92", "99", "%", "Monthly", "Ops dashboard", "VRM"]);
    dv(ho, 1, "kpis", kpiHr + 1);
    ho.addRow([]); ho.addRow([]);
    const artHr = table(ho, ["Type", "Title", "Detail", "Planned value", "Category"], ["EXPECTED_BENEFIT", "Licence takeout", "Annual saving", "1800000", "COST_SAVING"]);
    dv(ho, 1, "hoType", artHr + 1);

    const rk = wb.addWorksheet("10. Risks");
    const rkHr = table(rk, ["Risk / description", "Likelihood (1–5)", "Impact (1–5)", "Score (auto)", "Mitigation", "Status"], ["Migration cutover disruption", "3", "4", "", "Phased cutover", "OPEN"]);
    dv(rk, 6, "riskstatus", rkHr + 1);
  } else if (kind === "VR") {
    const tk = kvSheet("1. Track", [
      ["Track title", ""],
      ["Solution profile", "Pick from list"],
      ["Currency", "e.g. USD"],
      ["Origin", "Handover from VE study / Standalone"],
      ["Source study code (if handover)", "e.g. VE-2026-014"],
      ["Objectives", ""],
      ["Success criteria", ""],
      ["Planned value", "Number"],
      ["Start date", "Date"],
      ["Target date", "Date"],
    ]);
    tk.getCell("B2").dataValidation = { type: "list", allowBlank: true, formulae: [listCol["profiles"]] };
    tk.getCell("B4").dataValidation = { type: "list", allowBlank: true, formulae: [listCol["origin"]] };

    const bl = wb.addWorksheet("2. Baselines");
    const blHr = table(bl, ["KPI (pick)", "KPI key (auto)", "Baseline value", "Unit (auto)", "Data source", "Frequency", "Owner", "Validated / established?"], ["MTTR", "mttr", "6.2", "hours", "Ops dashboard", "Monthly", "VRM", "yes"]);
    dv(bl, 1, "kpis", blHr + 1);
    dv(bl, 8, "yesno", blHr + 1);

    const wp = wb.addWorksheet("3. Work packages");
    const wpHr = table(wp, ["Name", "Description", "Owner", "Start", "Due", "Status"], ["Implement: consolidate schedulers", "Migrate jobs", "Delivery lead", "", "", "NOT_STARTED"]);
    dv(wp, 6, "wpstatus", wpHr + 1);

    const ap = wb.addWorksheet("4. Adoption plan");
    const apHr = table(ap, ["Activity", "Audience / who's impacted", "Owner", "Due", "Status"], ["Jobs-as-code training for ops", "Ops team", "Enablement", "", "NOT_STARTED"]);
    dv(ap, 5, "wpstatus", apHr + 1);

    const kt = wb.addWorksheet("5. KPI tracker");
    const ktHr = table(kt, ["KPI (pick)", "KPI key (auto)", "Baseline", "Target", "Unit (auto)", "Period", "Actual", "Attainment % (auto)"], ["SLA attainment", "sla_attainment", "92", "99", "%", "Q1", "96", ""]);
    dv(kt, 1, "kpis", ktHr + 1);

    const bn = wb.addWorksheet("6. Benefits");
    const bnHr = table(bn, ["Benefit", "Category", "Planned value", "Realized value", "Variance (auto)"], ["Licence + rerun saving", "COST_SAVING", "1800000", "1200000", ""]);
    dv(bn, 2, "category", bnHr + 1);

    const rk = wb.addWorksheet("7. Risks & issues");
    const rkHr = table(rk, ["Risk / issue", "Likelihood (1–5)", "Impact (1–5)", "Score (auto)", "Mitigation", "Status"], ["Adoption lag in ops team", "3", "3", "", "Champions + comms", "OPEN"]);
    dv(rk, 6, "riskstatus", rkHr + 1);

    kvSheet("8. QBR notes", [
      ["Realized vs planned (summary)", ""],
      ["Wins", ""],
      ["Risks / blockers", ""],
      ["Renewal / expansion signal", ""],
      ["Actions & owners", "semicolon-separated"],
    ]);

    const ls = wb.addWorksheet("9. Lessons");
    table(ls, ["Category", "Lesson", "Recommendation for next time"], ["what_worked", "Phased cutover reduced risk", "Reuse the cutover checklist"]);
  } else {
    // -------------------------------------------------------------- CS ----
    const acc = kvSheet("1. Account", [
      ["Account / customer", "Free text"],
      ["Solution profile", "Pick from list"],
      ["Currency", "e.g. USD"],
      ["Status", "ACTIVE / AT_RISK / …"],
      ["ARR", "Number"],
      ["Renewal date", "Date"],
      ["Start date", "Date"],
      ["Objectives", ""],
    ]);
    acc.getCell("B2").dataValidation = { type: "list", allowBlank: true, formulae: [listCol["profiles"]] };
    acc.getCell("B4").dataValidation = { type: "list", allowBlank: true, formulae: [listCol["engstatus"]] };

    kvSheet("2. Success plan", [
      ["Success criteria", ""],
      ["Commitments", ""],
      ["Notes", ""],
    ]);

    // Lifecycle: one row per stage, status picked from the list.
    const lc = wb.addWorksheet("3. Lifecycle");
    lc.getColumn(1).width = 32;
    lc.getColumn(2).width = 20;
    lc.getColumn(3).width = 40;
    const lcHead = lc.addRow(["Stage", "Status", "Notes (optional)"]);
    styleHeader(lcHead);
    CS_STAGES.forEach((s) => {
      const r = lc.addRow([s.title, "NOT_STARTED", ""]);
      r.getCell(1).font = { bold: true };
      r.getCell(2).dataValidation = { type: "list", allowBlank: true, formulae: [listCol["stagestatus"]] };
    });

    const st = wb.addWorksheet("4. Stakeholders");
    const stHr = table(st, ["Name", "Title", "Role", "Influence (1–5)", "Sentiment", "Notes"], ["e.g. T. Mokoena", "CIO", "Executive sponsor", "5", "PROMOTER", ""]);
    dv(st, 5, "sentiment", stHr + 1);

    // Health: one KV row per factor (score 0–100) plus period label + note.
    kvSheet("5. Health", [
      ...HEALTH_FACTORS.map((f) => [f.label, "0–100"] as [string, string]),
      ["Period label", "e.g. Q1 FY26"],
      ["Note", ""],
    ]);

    const ac = wb.addWorksheet("6. Actions");
    const acHr = table(ac, ["Title", "Owner", "Due", "Status"], ["e.g. Book renewal EBR", "CSM", "", "OPEN"]);
    dv(ac, 4, "actionstatus", acHr + 1);

    kvSheet("7. Renewal", [
      ["Renewal date", "Date"],
      ["Stage", ""],
      ["Value summary", ""],
      ["Risks", ""],
      ["Procurement status", ""],
      ["Planned actions", ""],
    ]);

    kvSheet("8. Growth", [
      ["Triggers", ""],
      ["Target value", "Number"],
      ["Narrative", ""],
    ]);

    // Two single-column tables, stacked. The importer finds each header in
    // column A, so they cannot sit side by side.
    const lk = wb.addWorksheet("9. Links");
    lk.getColumn(1).width = 24;
    table(lk, ["VE study code"], ["e.g. VE-2026-014"]);
    lk.addRow([]);
    table(lk, ["VR track code"], ["e.g. VR-2026-014"]);
  }

  return wb;
}
