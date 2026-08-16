/**
 * Import a Blue Turtle capture workbook (VE Discovery or VR Intake) into the app.
 *
 *   npx tsx scripts/import-workbook.ts <file.xlsx> [options]
 *     --owner <email>   owner user (default: an org VE/VRM, else first member)
 *     --org <id>        organization id (default: org_demo)
 *     --code <CODE>     force the VE/VR code (default: auto VE-YYYY-NNN / VR-YYYY-NNN)
 *     --dry-run         parse + report only, write nothing (default is to WRITE)
 *
 * The workbook columns/enums mirror the schema 1:1, so this is a mapping, not a
 * transform. Greyed example rows are skipped; blank rows are ignored.
 */
import ExcelJS from "exceljs";
import { PrismaClient, Prisma } from "@prisma/client";
import { INDUSTRY_PROFILES } from "../src/lib/domain/industries";
import { VE_PHASES, VR_PHASES } from "../src/lib/domain/phases";
import { DEFAULT_CRITERIA } from "../src/lib/evaluation";
import { computeFinance, CashFlowLine } from "../src/lib/finance";

const prisma = new PrismaClient();

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--"));
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const DRY = argv.includes("--dry-run");
const ORG_ID = opt("org") ?? "org_demo";
const OWNER_EMAIL = opt("owner");
const FORCE_CODE = opt("code");
if (!file) { console.error("Usage: import-workbook.ts <file.xlsx> [--owner email] [--org id] [--code CODE] [--dry-run]"); process.exit(1); }

// ---- cell helpers -----------------------------------------------------------
function cellVal(c: ExcelJS.Cell | undefined): any {
  if (!c) return null;
  const v = c.value as any;
  if (v == null) return null;
  if (typeof v === "object") {
    if (v.result !== undefined) return v.result;      // formula → cached result
    if (v.text !== undefined) return v.text;           // rich text / hyperlink
    if (v instanceof Date) return v;
    return null;
  }
  return v;
}
const str = (v: any) => { const s = v == null ? "" : String(v).trim(); return s === "" ? null : s; };
const num = (v: any) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const date = (v: any) => { if (!v) return null; if (v instanceof Date) return v; const d = new Date(String(v)); return isNaN(+d) ? null : d; };
const norm = (v: any) => String(v ?? "").trim().toLowerCase();

// Find the row whose leading cells match `headers` (case-insensitive). Returns 1-based row or 0.
function findHeaderRow(ws: ExcelJS.Worksheet, headers: string[]): number {
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    let ok = true;
    for (let i = 0; i < headers.length; i++) {
      if (norm(cellVal(row.getCell(i + 1))) !== norm(headers[i])) { ok = false; break; }
    }
    if (ok) return r;
  }
  return 0;
}

// Read a contiguous table under `headers`. The greyed sample lives at header+1
// and is skipped only there (so a real row sharing that first cell deeper down
// is never dropped). Stops at the first fully-blank row — keep tables contiguous.
function readTable(ws: ExcelJS.Worksheet | undefined, headers: string[], exampleFirst?: string): Record<string, any>[] {
  if (!ws) return [];
  const hr = findHeaderRow(ws, headers.slice(0, 2)); // match on first 2 headers (robust to trailing "(auto)" cols)
  if (!hr) return [];
  const out: Record<string, any>[] = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec: Record<string, any> = {};
    let anyVal = false;
    headers.forEach((h, i) => { const v = cellVal(row.getCell(i + 1)); rec[h] = v; if (v != null && String(v).trim() !== "") anyVal = true; });
    if (!anyVal) break;                                                        // contiguous table → stop at first blank
    if (r === hr + 1 && exampleFirst && norm(cellVal(row.getCell(1))) === norm(exampleFirst)) continue; // skip sample row only at header+1
    out.push(rec);
  }
  return out;
}

// Key/value lookup: find label in column A, return column B.
function kv(ws: ExcelJS.Worksheet | undefined, label: string): any {
  if (!ws) return null;
  for (let r = 1; r <= ws.rowCount; r++) {
    if (norm(cellVal(ws.getRow(r).getCell(1))) === norm(label)) return cellVal(ws.getRow(r).getCell(2));
  }
  return null;
}

function profileKey(name: string | null): string | null {
  if (!name) return null;
  const p = INDUSTRY_PROFILES.find((p) => norm(p.name) === norm(name) || norm(p.key) === norm(name));
  return p?.key ?? null;
}
function critKeyFor(label: string): string {
  const c = DEFAULT_CRITERIA.find((c: any) => norm(c.label) === norm(label));
  return c ? c.key : String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}
async function nextCode(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const n = prefix === "VE" ? await prisma.study.count() : await prisma.realizationTrack.count();
  return `${prefix}-${year}-${String(n + 1).padStart(3, "0")}`;
}

async function resolveOwner(roleHint: string): Promise<string> {
  if (OWNER_EMAIL) {
    const u = await prisma.user.findFirst({ where: { email: OWNER_EMAIL, organizationId: ORG_ID } });
    if (!u) throw new Error(`Owner ${OWNER_EMAIL} not found in org ${ORG_ID}`);
    return u.id;
  }
  const m = await prisma.membership.findFirst({ where: { organizationId: ORG_ID, role: roleHint as any }, include: { user: true } });
  if (m) return m.userId;
  const any = await prisma.membership.findFirst({ where: { organizationId: ORG_ID } });
  if (!any) throw new Error(`No members in org ${ORG_ID}`);
  return any.userId;
}

// =============================================================================
async function importVE(wb: ExcelJS.Workbook) {
  const eng = wb.getWorksheet("1. Engagement");
  const ori = wb.getWorksheet("2. Orientation");
  const title = str(kv(eng, "Study title (as it will appear in app)")) ?? str(kv(eng, "Opportunity name")) ?? "Imported VE study";
  const industryKey = profileKey(str(kv(eng, "Solution profile")));
  if (!industryKey) throw new Error("Solution profile is missing or unrecognised on '1. Engagement'.");
  const currency = str(kv(eng, "Currency")) ?? "ZAR";
  const scopeIn = str(kv(ori, "Scope — IN")); const scopeOut = str(kv(ori, "Scope — OUT"));
  const scope = [scopeIn && `In: ${scopeIn}`, scopeOut && `Out: ${scopeOut}`].filter(Boolean).join("  ") || null;

  const functions = readTable(wb.getWorksheet("4. Functions"), ["Verb", "Noun", "Kind", "Cost", "Worth"], "Orchestrate");
  const alts = readTable(wb.getWorksheet("5. Alternatives"), ["Idea", "Linked function (verb+noun)", "Description", "Rough value", "Shortlisted?"], "Consolidate schedulers onto Control-M");
  const recs = readTable(wb.getWorksheet("7. Recommendations"), ["Title", "Summary", "Technical detail", "Commercial detail", "Est. value", "Est. cost", "Status"], "Consolidate schedulers onto Control-M");
  const baseline = readTable(wb.getWorksheet("3. Baseline"), ["Item / metric", "Current value", "Unit", "Source", "Period", "Assumption", "Confidence"], "Failed / rerun jobs");
  const stake = readTable(wb.getWorksheet("2. Orientation"), ["Name", "Role / title", "Economic buyer?", "Owns which numbers", "Notes"], "e.g. J. Dlamini");
  const lines = readTable(wb.getWorksheet("8. Business case"), ["Label", "Kind", "Category", "Amount", "Year (0=now)", "Recurring?"], "Legacy scheduler licence takeout");
  const kpis = readTable(wb.getWorksheet("9. Handover pack"), ["KPI (pick)", "KPI key (auto)", "Baseline", "Target", "Unit (auto)", "Frequency", "Data source", "Owner"], "SLA attainment");
  const arts = readTable(wb.getWorksheet("9. Handover pack"), ["Type", "Title", "Detail", "Planned value", "Category"], "EXPECTED_BENEFIT");
  const risks = readTable(wb.getWorksheet("10. Risks"), ["Risk / description", "Likelihood (1–5)", "Impact (1–5)", "Score (auto)", "Mitigation", "Status"], "Migration cutover disruption");

  // evaluation criteria + scores
  const evalWs = wb.getWorksheet("6. Evaluation");
  const critRows = readTable(evalWs, ["Criterion", "Weight %"]);
  const criteria = critRows.filter((c) => str(c["Criterion"]) && str(c["Criterion"]) !== "Total").map((c) => ({ key: critKeyFor(String(c["Criterion"])), label: String(c["Criterion"]).trim(), weight: num(c["Weight %"]) ?? 0 }));

  // finance
  const cfl: CashFlowLine[] = lines.map((l) => ({ label: String(l["Label"]), kind: (str(l["Kind"]) as any) ?? "OPEX", amount: num(l["Amount"]) ?? 0, year: num(l["Year (0=now)"]), recurring: norm(l["Recurring?"]) === "yes" }));
  const fin = computeFinance(cfl, { discountRatePct: num(kv(wb.getWorksheet("8. Business case"), "Discount rate")) != null ? (num(kv(wb.getWorksheet("8. Business case"), "Discount rate"))! * 100) : 8, horizonYears: num(kv(wb.getWorksheet("8. Business case"), "Horizon (years)")) ?? 5 });

  const ownerId = await resolveOwner("VALUE_ENGINEER");
  const code = FORCE_CODE ?? (await nextCode("VE"));

  const plan = {
    code, title, industryKey, currency,
    counts: { functions: functions.length, alternatives: alts.length, recommendations: recs.length, baselineItems: baseline.length, stakeholders: stake.length, costItems: cfl.length, kpis: kpis.filter((k) => str(k["KPI (pick)"])).length, handoverArtifacts: arts.filter((a) => str(a["Type"])).length, risks: risks.length, criteria: criteria.length },
    finance: { investment: fin.totalInvestment, annualNetBenefit: fin.annualNetBenefit, roiPct: fin.roiPct, paybackMonths: fin.paybackMonths, npv: fin.npv, irrPct: fin.irrPct },
  };
  console.log("VE study plan:\n" + JSON.stringify(plan, null, 2));
  if (DRY) { console.log("\n[dry-run] nothing written."); return; }

  await prisma.$transaction(async (tx) => {
    const study = await tx.study.create({ data: {
      code, title, industryKey, currency, ownerId, organizationId: ORG_ID, status: "DRAFT",
      studyType: str(kv(eng, "Study type")), problemStatement: str(kv(ori, "Problem statement (1–2 lines)")),
      scope, summary: str(kv(ori, "Value hypothesis (rough size & driver)")), estimatedValue: num(kv(eng, "Estimated value (optional)")),
      evaluationCriteria: (criteria.length ? criteria : DEFAULT_CRITERIA) as unknown as Prisma.InputJsonValue,
      startedAt: new Date(), targetDate: date(kv(eng, "Target decision date")),
      phases: { create: VE_PHASES.map((p) => ({ phase: p.key as any, order: p.order })) },
    }});
    // info items: baseline + stakeholders
    for (const b of baseline) if (str(b["Item / metric"])) await tx.infoItem.create({ data: { studyId: study.id, label: String(b["Item / metric"]), category: "cost", value: [str(b["Current value"]), str(b["Unit"]), str(b["Period"]) && `(${str(b["Period"])})`].filter(Boolean).join(" "), source: [str(b["Source"]), str(b["Assumption"]) && `assumption: ${str(b["Assumption"])}`, str(b["Confidence"]) && `confidence: ${str(b["Confidence"])}`].filter(Boolean).join(" · ") } });
    for (const s of stake) if (str(s["Name"])) await tx.infoItem.create({ data: { studyId: study.id, label: String(s["Name"]), category: "stakeholder", value: [str(s["Role / title"]), str(s["Economic buyer?"]) && `economic buyer: ${str(s["Economic buyer?"])}`, str(s["Owns which numbers"])].filter(Boolean).join(" · "), source: str(s["Notes"]) } });
    // functions
    const fnIdByKey: Record<string, string> = {};
    let fo = 1;
    for (const f of functions) if (str(f["Verb"]) && str(f["Noun"])) { const fn = await tx.functionItem.create({ data: { studyId: study.id, verb: String(f["Verb"]), noun: String(f["Noun"]), kind: (norm(f["Kind"]) === "basic" ? "BASIC" : "SECONDARY"), cost: num(f["Cost"]), worth: num(f["Worth"]), order: fo++ } }); fnIdByKey[norm(`${f["Verb"]} ${f["Noun"]}`)] = fn.id; }
    // recommendations (create first so alternatives can link if needed later)
    const recByTitle: Record<string, string> = {};
    let ro = 1;
    for (const r of recs) if (str(r["Title"])) { const rec = await tx.recommendation.create({ data: { studyId: study.id, title: String(r["Title"]), summary: str(r["Summary"]), technicalDetail: str(r["Technical detail"]), commercialDetail: str(r["Commercial detail"]), status: (str(r["Status"]) as any) ?? "PROPOSED", estimatedValue: num(r["Est. value"]), estimatedCost: num(r["Est. cost"]), order: ro++ } }); recByTitle[norm(r["Title"])] = rec.id; }
    // alternatives (link to function by verb+noun; scores from evaluation grid)
    const scoreRows = readTable(evalWs, ["Alternative", ...criteria.map((c) => c.label)], "Consolidate on Control-M");
    const scoreByAlt: Record<string, any> = {};
    for (const sr of scoreRows) { const alt = norm(sr["Alternative"]); if (!alt) continue; const sc: Record<string, number> = {}; for (const c of criteria) { const v = num(sr[c.label]); if (v != null) sc[c.key] = v; } scoreByAlt[alt] = sc; }
    for (const a of alts) if (str(a["Idea"])) { const sc = scoreByAlt[norm(a["Idea"])]; let weighted: number | null = null; if (sc) { const tw = criteria.reduce((s, c) => s + (c.weight || 0), 0) || 1; weighted = criteria.reduce((s, c) => s + (sc[c.key] ?? 0) * (c.weight || 0), 0) / tw; } await tx.alternative.create({ data: { studyId: study.id, idea: String(a["Idea"]), description: str(a["Description"]), functionId: fnIdByKey[norm(a["Linked function (verb+noun)"])] ?? null, shortlisted: norm(a["Shortlisted?"]) === "yes", scores: sc ? (sc as Prisma.InputJsonValue) : undefined, weightedScore: weighted } }); }
    // business case + cost items + computed finance
    const bcWs = wb.getWorksheet("8. Business case");
    const bc = await tx.businessCase.create({ data: { studyId: study.id, currency, discountRatePct: (num(kv(bcWs, "Discount rate")) ?? 0.08) * 100, horizonYears: num(kv(bcWs, "Horizon (years)")) ?? 5, roiPct: fin.roiPct, paybackMonths: fin.paybackMonths, npv: fin.npv, irrPct: fin.irrPct, executiveSummary: str(kv(ori, "Value hypothesis (rough size & driver)")) } });
    for (const l of lines) if (str(l["Label"])) await tx.costItem.create({ data: { businessCaseId: bc.id, label: String(l["Label"]), kind: str(l["Kind"]) ?? "OPEX", category: (str(l["Category"]) as any) ?? null, amount: num(l["Amount"]) ?? 0, year: num(l["Year (0=now)"]), recurring: norm(l["Recurring?"]) === "yes" } });
    // handover artifacts: KPIs + typed rows
    let ho = 0;
    for (const k of kpis) if (str(k["KPI (pick)"])) await tx.handoverArtifact.create({ data: { studyId: study.id, type: "KPI", title: String(k["KPI (pick)"]), detail: str(k["Data source"]), order: ho++, data: { kpiKey: str(k["KPI key (auto)"]), baselineValue: num(k["Baseline"]), targetValue: num(k["Target"]), unit: str(k["Unit (auto)"]), frequency: str(k["Frequency"]), dataSource: str(k["Data source"]), owner: str(k["Owner"]) } as Prisma.InputJsonValue } });
    for (const a of arts) if (str(a["Type"])) await tx.handoverArtifact.create({ data: { studyId: study.id, type: String(a["Type"]), title: str(a["Title"]) ?? String(a["Type"]), detail: str(a["Detail"]), order: ho++, data: { plannedValue: num(a["Planned value"]), category: str(a["Category"]) } as Prisma.InputJsonValue } });
    // risks
    for (const r of risks) if (str(r["Risk / description"])) await tx.riskItem.create({ data: { studyId: study.id, title: String(r["Risk / description"]).slice(0, 120), description: str(r["Risk / description"]), likelihood: num(r["Likelihood (1–5)"]) ?? undefined, impact: num(r["Impact (1–5)"]) ?? undefined, mitigation: str(r["Mitigation"]), status: (str(r["Status"]) as any) ?? "OPEN" } });
    await tx.auditEvent.create({ data: { action: "study.imported", entityType: "Study", entityId: study.id, studyId: study.id, actorId: ownerId, metadata: { source: "workbook-import" } } });
    console.log(`\n✓ Imported study ${code} (${study.id}).`);
  }, { timeout: 60000 });
}

// =============================================================================
async function importVR(wb: ExcelJS.Workbook) {
  const t = wb.getWorksheet("1. Track");
  const title = str(kv(t, "Track title")) ?? "Imported realization track";
  const industryKey = profileKey(str(kv(t, "Solution profile")));
  if (!industryKey) throw new Error("Solution profile is missing or unrecognised on '1. Track'.");
  const currency = str(kv(t, "Currency")) ?? "ZAR";
  const originRaw = norm(kv(t, "Origin"));
  const isHandover = originRaw.includes("handover");
  const sourceCode = str(kv(t, "Source study code (if handover)"));
  const ownerId = await resolveOwner("VALUE_REALIZATION_MANAGER");

  let studyId: string | null = null;
  if (isHandover && sourceCode) { const s = await prisma.study.findUnique({ where: { code: sourceCode } }); studyId = s?.id ?? null; }

  const baselines = readTable(wb.getWorksheet("2. Baselines"), ["KPI (pick)", "KPI key (auto)", "Baseline value", "Unit (auto)", "Data source", "Frequency", "Owner", "Validated / established?"], "MTTR");
  const wps = readTable(wb.getWorksheet("3. Work packages"), ["Name", "Description", "Owner", "Start", "Due", "Status"], "Implement: consolidate schedulers");
  const acts = readTable(wb.getWorksheet("4. Adoption plan"), ["Activity", "Audience / who's impacted", "Owner", "Due", "Status"], "Jobs-as-code training for ops");
  const tracker = readTable(wb.getWorksheet("5. KPI tracker"), ["KPI (pick)", "KPI key (auto)", "Baseline", "Target", "Unit (auto)", "Period", "Actual", "Attainment % (auto)"], "SLA attainment");
  const benefits = readTable(wb.getWorksheet("6. Benefits"), ["Benefit", "Category", "Planned value", "Realized value", "Variance (auto)"], "Licence + rerun saving");
  const risks = readTable(wb.getWorksheet("7. Risks & issues"), ["Risk / issue", "Likelihood (1–5)", "Impact (1–5)", "Score (auto)", "Mitigation", "Status"], "Adoption lag in ops team");
  const lessons = readTable(wb.getWorksheet("9. Lessons"), ["Category", "Lesson", "Recommendation for next time"], "what_worked");

  const code = FORCE_CODE ?? (await nextCode("VR"));
  const plan = { code, title, industryKey, origin: isHandover ? "VE_HANDOVER" : "STANDALONE", sourceStudy: studyId ? sourceCode : null, counts: { baselines: baselines.length, workPackages: wps.length, adoptionActivities: acts.length, kpiActuals: tracker.length, benefits: benefits.length, risks: risks.length, lessons: lessons.length } };
  console.log("VR track plan:\n" + JSON.stringify(plan, null, 2));
  if (DRY) { console.log("\n[dry-run] nothing written."); return; }

  await prisma.$transaction(async (tx) => {
    const track = await tx.realizationTrack.create({ data: {
      code, title, industryKey, currency, ownerId, organizationId: ORG_ID,
      origin: (isHandover ? "VE_HANDOVER" : "STANDALONE") as any, studyId,
      status: "PLANNING", health: "GREEN",
      objectives: str(kv(t, "Objectives")), successCriteria: str(kv(t, "Success criteria")),
      plannedValue: num(kv(t, "Planned value")), startedAt: date(kv(t, "Start date")) ?? new Date(), targetDate: date(kv(t, "Target date")),
      phases: { create: VR_PHASES.map((p) => ({ phase: p.key as any, order: p.order })) },
      adoptionPlan: { create: {} },
    }});
    // KPI targets (baselines tab) + actuals (tracker tab, matched by KPI name)
    const targetByKpi: Record<string, string> = {};
    for (const b of baselines) if (str(b["KPI (pick)"])) { const kt = await tx.kpiTarget.create({ data: { trackId: track.id, kpiKey: str(b["KPI key (auto)"]) ?? String(b["KPI (pick)"]), baselineValue: num(b["Baseline value"]), unit: str(b["Unit (auto)"]) ?? "", frequency: str(b["Frequency"]), dataSource: str(b["Data source"]), ownerName: str(b["Owner"]) } }); targetByKpi[norm(b["KPI (pick)"])] = kt.id; }
    for (const row of tracker) { const nm = norm(row["KPI (pick)"]); if (!nm) continue; let ktId = targetByKpi[nm]; if (!ktId) { const kt = await tx.kpiTarget.create({ data: { trackId: track.id, kpiKey: str(row["KPI key (auto)"]) ?? String(row["KPI (pick)"]), baselineValue: num(row["Baseline"]), targetValue: num(row["Target"]), unit: str(row["Unit (auto)"]) ?? "" } }); ktId = kt.id; targetByKpi[nm] = ktId; } else if (num(row["Target"]) != null) { await tx.kpiTarget.update({ where: { id: ktId }, data: { targetValue: num(row["Target"]) } }); } const period = str(row["Period"]); const actual = num(row["Actual"]); if (period && actual != null) await tx.kpiActual.create({ data: { kpiTargetId: ktId, periodLabel: period, periodDate: date(period) ?? new Date(), value: actual } }); }
    // work packages
    let wo = 1;
    for (const w of wps) if (str(w["Name"])) await tx.workPackage.create({ data: { trackId: track.id, name: String(w["Name"]), description: str(w["Description"]), status: (str(w["Status"]) as any) ?? "NOT_STARTED", startDate: date(w["Start"]), dueDate: date(w["Due"]), order: wo++ } });
    // adoption activities
    const ap = await tx.adoptionPlan.findUnique({ where: { trackId: track.id } });
    let ao = 1;
    if (ap) for (const a of acts) if (str(a["Activity"])) await tx.adoptionActivity.create({ data: { adoptionPlanId: ap.id, label: String(a["Activity"]), audience: str(a["Audience / who's impacted"]), status: (str(a["Status"]) as any) ?? "NOT_STARTED", dueDate: date(a["Due"]), order: ao++ } });
    // benefits
    for (const b of benefits) if (str(b["Benefit"])) await tx.benefit.create({ data: { trackId: track.id, label: String(b["Benefit"]), category: (str(b["Category"]) as any) ?? "COST_SAVING", plannedValue: num(b["Planned value"]) ?? 0, realizedValue: num(b["Realized value"]) ?? 0, currency } });
    // risks
    for (const r of risks) if (str(r["Risk / issue"])) await tx.riskItem.create({ data: { trackId: track.id, title: String(r["Risk / issue"]).slice(0, 120), description: str(r["Risk / issue"]), likelihood: num(r["Likelihood (1–5)"]) ?? undefined, impact: num(r["Impact (1–5)"]) ?? undefined, mitigation: str(r["Mitigation"]), status: (str(r["Status"]) as any) ?? "OPEN" } });
    // lessons
    for (const l of lessons) if (str(l["Lesson"])) await tx.lessonLearned.create({ data: { trackId: track.id, category: str(l["Category"]), detail: String(l["Lesson"]), feedsBackTo: str(l["Recommendation for next time"]) } });
    // QBR notes → a value report (optional)
    const qbr = wb.getWorksheet("8. QBR notes");
    const summary = str(kv(qbr, "Realized vs planned (summary)"));
    if (summary) await tx.valueReport.create({ data: { trackId: track.id, kind: "QBR" as any, title: "QBR — imported", content: { executiveStory: summary, wins: str(kv(qbr, "Wins")), risks: str(kv(qbr, "Risks / blockers")), expansion: str(kv(qbr, "Renewal / expansion signal")), nextBestActions: str(kv(qbr, "Actions & owners")) } as Prisma.InputJsonValue } });
    await tx.auditEvent.create({ data: { action: "track.imported", entityType: "RealizationTrack", entityId: track.id, trackId: track.id, actorId: ownerId, metadata: { source: "workbook-import", origin: isHandover ? "VE_HANDOVER" : "STANDALONE" } } });
    console.log(`\n✓ Imported track ${code} (${track.id}).`);
  }, { timeout: 60000 });
}

// =============================================================================
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const isVE = !!wb.getWorksheet("1. Engagement");
  const isVR = !!wb.getWorksheet("1. Track");
  console.log(`File: ${file}\nOrg: ${ORG_ID}  Owner: ${OWNER_EMAIL ?? "(auto)"}  ${DRY ? "[DRY RUN]" : "[WRITE]"}\nType: ${isVE ? "VE Discovery Workbook" : isVR ? "VR Intake Workbook" : "UNKNOWN"}\n`);
  if (isVE) await importVE(wb);
  else if (isVR) await importVR(wb);
  else throw new Error("Not a recognised capture workbook (missing '1. Engagement' or '1. Track').");
  await prisma.$disconnect();
})().catch(async (e) => { console.error("\n✗ Import failed:", e.message); await prisma.$disconnect(); process.exit(1); });
