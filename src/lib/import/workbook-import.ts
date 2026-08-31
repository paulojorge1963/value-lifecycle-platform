/**
 * Blue Turtle capture-workbook importer (VE Discovery, VR Intake, CS Intake).
 *
 * Shared engine used by BOTH the CLI (scripts/import-workbook.ts) and the in-app
 * upload API (src/app/api/import/route.ts). The workbook columns/enums mirror the
 * schema 1:1, so this is a mapping, not a transform. Greyed example rows are
 * skipped; blank rows end a table.
 */
import ExcelJS from "exceljs";
import { PrismaClient, Prisma } from "@prisma/client";
import { INDUSTRY_PROFILES } from "../domain/industries";
import { CS_STAGES } from "../domain/cs-stages";
import { HEALTH_FACTORS, overallScore, ragFor } from "../domain/cs-health";
import { VE_PHASES, VR_PHASES } from "../domain/phases";
import { DEFAULT_CRITERIA } from "../evaluation";
import { computeFinance, CashFlowLine } from "../finance";

export type ImportKind = "VE" | "VR" | "CS";
export type ImportEntity = "study" | "track" | "engagement";
export interface ImportOptions {
  orgId?: string;       // default "org_demo"
  ownerEmail?: string;  // default: an org member with the matching role, else first member
  forceCode?: string;   // default: auto <PREFIX>-YYYY-NNN
  dryRun?: boolean;     // parse + report, write nothing
}
export interface ImportResult {
  kind: ImportKind;
  entity: ImportEntity;
  code: string;
  title: string;
  plan: Record<string, unknown>;
  entityId?: string;    // set when written
  existingId?: string;  // set when an entity already uses this code
}

// A Prisma client OR an interactive transaction client both satisfy the calls below.
type Db = PrismaClient;

// ---- cell helpers -----------------------------------------------------------
function cellVal(c: ExcelJS.Cell | undefined): any {
  if (!c) return null;
  const v = c.value as any;
  if (v == null) return null;
  if (typeof v === "object") {
    if (v.result !== undefined) return v.result;
    if (v.text !== undefined) return v.text;
    if (v instanceof Date) return v;
    return null;
  }
  return v;
}
const str = (v: any) => { const s = v == null ? "" : String(v).trim(); return s === "" ? null : s; };
const num = (v: any) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const date = (v: any) => { if (!v) return null; if (v instanceof Date) return v; const d = new Date(String(v)); return isNaN(+d) ? null : d; };
const norm = (v: any) => String(v ?? "").trim().toLowerCase();

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

function readTable(ws: ExcelJS.Worksheet | undefined, headers: string[], exampleFirst?: string): Record<string, any>[] {
  if (!ws) return [];
  const hr = findHeaderRow(ws, headers.slice(0, 2));
  if (!hr) return [];
  const out: Record<string, any>[] = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec: Record<string, any> = {};
    let anyVal = false;
    headers.forEach((h, i) => { const v = cellVal(row.getCell(i + 1)); rec[h] = v; if (v != null && String(v).trim() !== "") anyVal = true; });
    if (!anyVal) break;
    if (r === hr + 1) {
      const f = row.getCell(1).font as { italic?: boolean } | undefined;
      const othersFilled = headers.slice(1).some((h, i) => { const v = cellVal(row.getCell(i + 2)); return v != null && String(v).trim() !== ""; });
      const isSample = (f && f.italic) || (exampleFirst && norm(cellVal(row.getCell(1))) === norm(exampleFirst) && !othersFilled);
      if (isSample) continue;
    }
    out.push(rec);
  }
  return out;
}

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

async function loadWorkbook(data: ArrayBuffer | Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs accepts a Buffer for .load(); pass ArrayBuffers through as Buffer.
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
  await wb.xlsx.load(buf as any);
  return wb;
}

/** Peek at the workbook's tabs to tell VE / VR / CS apart (no DB access). */
export async function detectKind(data: ArrayBuffer | Buffer): Promise<ImportKind | null> {
  const wb = await loadWorkbook(data);
  if (wb.getWorksheet("1. Engagement")) return "VE";
  if (wb.getWorksheet("1. Track")) return "VR";
  if (wb.getWorksheet("1. Account")) return "CS";
  return null;
}

/**
 * Parse and (unless dryRun) create the entity from a capture workbook buffer.
 * Throws Error with a friendly message on any recognised problem.
 */
export async function importWorkbook(data: ArrayBuffer | Buffer, opts: ImportOptions, prisma: Db): Promise<ImportResult> {
  const ORG_ID = opts.orgId ?? "org_demo";
  const OWNER_EMAIL = opts.ownerEmail;
  const FORCE_CODE = opts.forceCode;
  const DRY = !!opts.dryRun;

  async function nextCode(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const n = prefix === "VE" ? await prisma.study.count()
      : prefix === "CS" ? await prisma.customerSuccessEngagement.count()
      : await prisma.realizationTrack.count();
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
    const anyM = await prisma.membership.findFirst({ where: { organizationId: ORG_ID } });
    if (!anyM) throw new Error(`No members in org ${ORG_ID}`);
    return anyM.userId;
  }

  const wb = await loadWorkbook(data);
  const kind = wb.getWorksheet("1. Engagement") ? "VE" : wb.getWorksheet("1. Track") ? "VR" : wb.getWorksheet("1. Account") ? "CS" : null;
  if (!kind) throw new Error("Not a recognised capture workbook (missing '1. Engagement', '1. Track' or '1. Account').");

  // ------------------------------------------------------------------ VE ----
  if (kind === "VE") {
    const eng = wb.getWorksheet("1. Engagement");
    const ori = wb.getWorksheet("2. Orientation");
    const title = str(kv(eng, "Study title (as it will appear in app)")) ?? str(kv(eng, "Opportunity name")) ?? "Imported VE study";
    const industryKey = profileKey(str(kv(eng, "Solution profile")));
    if (!industryKey) throw new Error("Solution profile is missing or unrecognised on '1. Engagement'.");
    const currency = str(kv(eng, "Currency")) ?? "USD";
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

    const evalWs = wb.getWorksheet("6. Evaluation");
    const critRows = readTable(evalWs, ["Criterion", "Weight %"]);
    const criteria = critRows.filter((c) => str(c["Criterion"]) && str(c["Criterion"]) !== "Total").map((c) => ({ key: critKeyFor(String(c["Criterion"])), label: String(c["Criterion"]).trim(), weight: num(c["Weight %"]) ?? 0 }));

    const cfl: CashFlowLine[] = lines.map((l) => ({ label: String(l["Label"]), kind: (str(l["Kind"]) as any) ?? "OPEX", amount: num(l["Amount"]) ?? 0, year: num(l["Year (0=now)"]), recurring: norm(l["Recurring?"]) === "yes" }));
    const bcWs = wb.getWorksheet("8. Business case");
    const fin = computeFinance(cfl, { discountRatePct: num(kv(bcWs, "Discount rate")) != null ? (num(kv(bcWs, "Discount rate"))! * 100) : 8, horizonYears: num(kv(bcWs, "Horizon (years)")) ?? 5 });

    const code = FORCE_CODE ?? (await nextCode("VE"));
    const existing = await prisma.study.findUnique({ where: { code }, select: { id: true } });
    const plan = {
      code, title, industryKey, currency,
      counts: { functions: functions.length, alternatives: alts.length, recommendations: recs.length, baselineItems: baseline.length, stakeholders: stake.length, costItems: cfl.length, kpis: kpis.filter((k) => str(k["KPI (pick)"])).length, handoverArtifacts: arts.filter((a) => str(a["Type"])).length, risks: risks.length, criteria: criteria.length },
      finance: { investment: fin.totalInvestment, annualNetBenefit: fin.annualNetBenefit, roiPct: fin.roiPct, paybackMonths: fin.paybackMonths, npv: fin.npv, irrPct: fin.irrPct },
    };
    if (DRY) return { kind, entity: "study", code, title, plan, existingId: existing?.id };
    if (existing) throw new Error(`Code ${code} already exists — choose Replace to overwrite, or import as a new study.`);

    let studyId = "";
    const ownerId = await resolveOwner("VALUE_ENGINEER");
    await prisma.$transaction(async (tx) => {
      const study = await tx.study.create({ data: {
        code, title, industryKey, currency, ownerId, organizationId: ORG_ID, status: "DRAFT",
        studyType: str(kv(eng, "Study type")), problemStatement: str(kv(ori, "Problem statement (1–2 lines)")),
        scope, summary: str(kv(ori, "Value hypothesis (rough size & driver)")), estimatedValue: num(kv(eng, "Estimated value (optional)")),
        evaluationCriteria: (criteria.length ? criteria : DEFAULT_CRITERIA) as unknown as Prisma.InputJsonValue,
        startedAt: new Date(), targetDate: date(kv(eng, "Target decision date")),
        phases: { create: VE_PHASES.map((p) => ({ phase: p.key as any, order: p.order })) },
      }});
      studyId = study.id;
      for (const b of baseline) if (str(b["Item / metric"])) await tx.infoItem.create({ data: { studyId: study.id, label: String(b["Item / metric"]), category: "cost", value: [str(b["Current value"]), str(b["Unit"]), str(b["Period"]) && `(${str(b["Period"])})`].filter(Boolean).join(" "), source: [str(b["Source"]), str(b["Assumption"]) && `assumption: ${str(b["Assumption"])}`, str(b["Confidence"]) && `confidence: ${str(b["Confidence"])}`].filter(Boolean).join(" · ") } });
      for (const s of stake) if (str(s["Name"])) await tx.infoItem.create({ data: { studyId: study.id, label: String(s["Name"]), category: "stakeholder", value: [str(s["Role / title"]), str(s["Economic buyer?"]) && `economic buyer: ${str(s["Economic buyer?"])}`, str(s["Owns which numbers"])].filter(Boolean).join(" · "), source: str(s["Notes"]) } });
      const fnIdByKey: Record<string, string> = {};
      let fo = 1;
      for (const f of functions) if (str(f["Verb"]) && str(f["Noun"])) { const fn = await tx.functionItem.create({ data: { studyId: study.id, verb: String(f["Verb"]), noun: String(f["Noun"]), kind: (norm(f["Kind"]) === "basic" ? "BASIC" : "SECONDARY"), cost: num(f["Cost"]), worth: num(f["Worth"]), order: fo++ } }); fnIdByKey[norm(`${f["Verb"]} ${f["Noun"]}`)] = fn.id; }
      let ro = 1;
      for (const r of recs) if (str(r["Title"])) { await tx.recommendation.create({ data: { studyId: study.id, title: String(r["Title"]), summary: str(r["Summary"]), technicalDetail: str(r["Technical detail"]), commercialDetail: str(r["Commercial detail"]), status: (str(r["Status"]) as any) ?? "PROPOSED", estimatedValue: num(r["Est. value"]), estimatedCost: num(r["Est. cost"]), order: ro++ } }); }
      const scoreRows = readTable(evalWs, ["Alternative", ...criteria.map((c) => c.label)], "Consolidate on Control-M");
      const scoreByAlt: Record<string, any> = {};
      for (const sr of scoreRows) { const alt = norm(sr["Alternative"]); if (!alt) continue; const sc: Record<string, number> = {}; for (const c of criteria) { const v = num(sr[c.label]); if (v != null) sc[c.key] = v; } scoreByAlt[alt] = sc; }
      for (const a of alts) if (str(a["Idea"])) { const sc = scoreByAlt[norm(a["Idea"])]; let weighted: number | null = null; if (sc) { const tw = criteria.reduce((s, c) => s + (c.weight || 0), 0) || 1; weighted = criteria.reduce((s, c) => s + (sc[c.key] ?? 0) * (c.weight || 0), 0) / tw; } await tx.alternative.create({ data: { studyId: study.id, idea: String(a["Idea"]), description: str(a["Description"]), functionId: fnIdByKey[norm(a["Linked function (verb+noun)"])] ?? null, shortlisted: norm(a["Shortlisted?"]) === "yes", scores: sc ? (sc as Prisma.InputJsonValue) : undefined, weightedScore: weighted } }); }
      const bc = await tx.businessCase.create({ data: { studyId: study.id, currency, discountRatePct: (num(kv(bcWs, "Discount rate")) ?? 0.08) * 100, horizonYears: num(kv(bcWs, "Horizon (years)")) ?? 5, roiPct: fin.roiPct, paybackMonths: fin.paybackMonths, npv: fin.npv, irrPct: fin.irrPct, executiveSummary: str(kv(ori, "Value hypothesis (rough size & driver)")) } });
      for (const l of lines) if (str(l["Label"])) await tx.costItem.create({ data: { businessCaseId: bc.id, label: String(l["Label"]), kind: str(l["Kind"]) ?? "OPEX", category: (str(l["Category"]) as any) ?? null, amount: num(l["Amount"]) ?? 0, year: num(l["Year (0=now)"]), recurring: norm(l["Recurring?"]) === "yes" } });
      let ho = 0;
      for (const k of kpis) if (str(k["KPI (pick)"])) await tx.handoverArtifact.create({ data: { studyId: study.id, type: "KPI", title: String(k["KPI (pick)"]), detail: str(k["Data source"]), order: ho++, data: { kpiKey: str(k["KPI key (auto)"]), baselineValue: num(k["Baseline"]), targetValue: num(k["Target"]), unit: str(k["Unit (auto)"]), frequency: str(k["Frequency"]), dataSource: str(k["Data source"]), owner: str(k["Owner"]) } as Prisma.InputJsonValue } });
      for (const a of arts) if (str(a["Type"])) await tx.handoverArtifact.create({ data: { studyId: study.id, type: String(a["Type"]), title: str(a["Title"]) ?? String(a["Type"]), detail: str(a["Detail"]), order: ho++, data: { plannedValue: num(a["Planned value"]), category: str(a["Category"]) } as Prisma.InputJsonValue } });
      for (const r of risks) if (str(r["Risk / description"])) await tx.riskItem.create({ data: { studyId: study.id, title: String(r["Risk / description"]).slice(0, 120), description: str(r["Risk / description"]), likelihood: num(r["Likelihood (1–5)"]) ?? undefined, impact: num(r["Impact (1–5)"]) ?? undefined, mitigation: str(r["Mitigation"]), status: (str(r["Status"]) as any) ?? "OPEN" } });
      await tx.auditEvent.create({ data: { action: "study.imported", entityType: "Study", entityId: study.id, studyId: study.id, actorId: ownerId, metadata: { source: "workbook-import" } } });
    }, { timeout: 60000 });
    return { kind, entity: "study", code, title, plan, entityId: studyId };
  }

  // ------------------------------------------------------------------ VR ----
  if (kind === "VR") {
    const t = wb.getWorksheet("1. Track");
    const title = str(kv(t, "Track title")) ?? "Imported realization track";
    const industryKey = profileKey(str(kv(t, "Solution profile")));
    if (!industryKey) throw new Error("Solution profile is missing or unrecognised on '1. Track'.");
    const currency = str(kv(t, "Currency")) ?? "USD";
    const originRaw = norm(kv(t, "Origin"));
    const isHandover = originRaw.includes("handover");
    const sourceCode = str(kv(t, "Source study code (if handover)"));

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
    const existing = await prisma.realizationTrack.findUnique({ where: { code }, select: { id: true } });
    const plan = { code, title, industryKey, origin: isHandover ? "VE_HANDOVER" : "STANDALONE", sourceStudy: studyId ? sourceCode : null, counts: { baselines: baselines.length, workPackages: wps.length, adoptionActivities: acts.length, kpiActuals: tracker.length, benefits: benefits.length, risks: risks.length, lessons: lessons.length } };
    if (DRY) return { kind, entity: "track", code, title, plan, existingId: existing?.id };
    if (existing) throw new Error(`Code ${code} already exists — choose Replace to overwrite, or import as a new track.`);

    let trackId = "";
    const ownerId = await resolveOwner("VALUE_REALIZATION_MANAGER");
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
      trackId = track.id;
      const targetByKpi: Record<string, string> = {};
      for (const b of baselines) if (str(b["KPI (pick)"])) { const kt = await tx.kpiTarget.create({ data: { trackId: track.id, kpiKey: str(b["KPI key (auto)"]) ?? String(b["KPI (pick)"]), baselineValue: num(b["Baseline value"]), unit: str(b["Unit (auto)"]) ?? "", frequency: str(b["Frequency"]), dataSource: str(b["Data source"]), ownerName: str(b["Owner"]) } }); targetByKpi[norm(b["KPI (pick)"])] = kt.id; }
      for (const row of tracker) { const nm = norm(row["KPI (pick)"]); if (!nm) continue; let ktId = targetByKpi[nm]; if (!ktId) { const kt = await tx.kpiTarget.create({ data: { trackId: track.id, kpiKey: str(row["KPI key (auto)"]) ?? String(row["KPI (pick)"]), baselineValue: num(row["Baseline"]), targetValue: num(row["Target"]), unit: str(row["Unit (auto)"]) ?? "" } }); ktId = kt.id; targetByKpi[nm] = ktId; } else if (num(row["Target"]) != null) { await tx.kpiTarget.update({ where: { id: ktId }, data: { targetValue: num(row["Target"]) } }); } const period = str(row["Period"]); const actual = num(row["Actual"]); if (period && actual != null) await tx.kpiActual.create({ data: { kpiTargetId: ktId, periodLabel: period, periodDate: date(period) ?? new Date(), value: actual } }); }
      let wo = 1;
      for (const w of wps) if (str(w["Name"])) await tx.workPackage.create({ data: { trackId: track.id, name: String(w["Name"]), description: str(w["Description"]), status: (str(w["Status"]) as any) ?? "NOT_STARTED", startDate: date(w["Start"]), dueDate: date(w["Due"]), order: wo++ } });
      const ap = await tx.adoptionPlan.findUnique({ where: { trackId: track.id } });
      let ao = 1;
      if (ap) for (const a of acts) if (str(a["Activity"])) await tx.adoptionActivity.create({ data: { adoptionPlanId: ap.id, label: String(a["Activity"]), audience: str(a["Audience / who's impacted"]), status: (str(a["Status"]) as any) ?? "NOT_STARTED", dueDate: date(a["Due"]), order: ao++ } });
      for (const b of benefits) if (str(b["Benefit"])) await tx.benefit.create({ data: { trackId: track.id, label: String(b["Benefit"]), category: (str(b["Category"]) as any) ?? "COST_SAVING", plannedValue: num(b["Planned value"]) ?? 0, realizedValue: num(b["Realized value"]) ?? 0, currency } });
      const realizedTotal = benefits.reduce((s, b) => s + (num(b["Realized value"]) ?? 0), 0);
      if (realizedTotal > 0) await tx.realizationTrack.update({ where: { id: track.id }, data: { realizedValue: realizedTotal } });
      for (const r of risks) if (str(r["Risk / issue"])) await tx.riskItem.create({ data: { trackId: track.id, title: String(r["Risk / issue"]).slice(0, 120), description: str(r["Risk / issue"]), likelihood: num(r["Likelihood (1–5)"]) ?? undefined, impact: num(r["Impact (1–5)"]) ?? undefined, mitigation: str(r["Mitigation"]), status: (str(r["Status"]) as any) ?? "OPEN" } });
      for (const l of lessons) if (str(l["Lesson"])) await tx.lessonLearned.create({ data: { trackId: track.id, category: str(l["Category"]), detail: String(l["Lesson"]), feedsBackTo: str(l["Recommendation for next time"]) } });
      const qbr = wb.getWorksheet("8. QBR notes");
      const summary = str(kv(qbr, "Realized vs planned (summary)"));
      if (summary) { const actions = str(kv(qbr, "Actions & owners")); await tx.valueReport.create({ data: { trackId: track.id, kind: "QUARTERLY_QBR" as any, title: "QBR — imported", content: { executiveStory: summary, wins: str(kv(qbr, "Wins")), risks: str(kv(qbr, "Risks / blockers")), expansion: str(kv(qbr, "Renewal / expansion signal")), nextBestActions: actions ? actions.split(/\s*;\s*/).filter(Boolean) : [] } as Prisma.InputJsonValue } }); }
      await tx.auditEvent.create({ data: { action: "track.imported", entityType: "RealizationTrack", entityId: track.id, trackId: track.id, actorId: ownerId, metadata: { source: "workbook-import", origin: isHandover ? "VE_HANDOVER" : "STANDALONE" } } });
    }, { timeout: 60000 });
    return { kind, entity: "track", code, title, plan, entityId: trackId };
  }

  // ------------------------------------------------------------------ CS ----
  const acc = wb.getWorksheet("1. Account");
  const accountName = str(kv(acc, "Account / customer")) ?? "Imported CS engagement";
  const industryKey = profileKey(str(kv(acc, "Solution profile")));
  if (!industryKey) throw new Error("Solution profile is missing or unrecognised on '1. Account'.");
  const currency = str(kv(acc, "Currency")) ?? "USD";
  const objectives = str(kv(acc, "Objectives"));

  const sp = wb.getWorksheet("2. Success plan");
  const successPlan = { successCriteria: str(kv(sp, "Success criteria")), commitments: str(kv(sp, "Commitments")), notes: str(kv(sp, "Notes")) };

  const lc = wb.getWorksheet("3. Lifecycle");
  const stageStatus: Record<string, string> = {};
  for (const s of CS_STAGES) { const v = str(kv(lc, s.title)); if (v) stageStatus[s.key] = v; }

  const stake = readTable(wb.getWorksheet("4. Stakeholders"), ["Name", "Title", "Role", "Influence (1–5)", "Sentiment", "Notes"], "e.g. T. Mokoena");

  const hw = wb.getWorksheet("5. Health");
  const scores: Record<string, number> = {};
  let anyScore = false;
  for (const f of HEALTH_FACTORS) { const v = num(kv(hw, f.label)); if (v != null) { scores[f.key] = v; anyScore = true; } }
  const health = anyScore
    ? { periodLabel: str(kv(hw, "Period label")) ?? "current", note: str(kv(hw, "Note")), overall: overallScore(scores), factors: HEALTH_FACTORS.map((f) => ({ key: f.key, label: f.label, score: scores[f.key] ?? 0, weight: f.weight })) }
    : null;

  const acts = readTable(wb.getWorksheet("6. Actions"), ["Title", "Owner", "Due", "Status"], "e.g. Book renewal EBR");

  const rn = wb.getWorksheet("7. Renewal");
  const renewal = { renewalDate: date(str(kv(rn, "Renewal date"))), stage: str(kv(rn, "Stage")), valueSummary: str(kv(rn, "Value summary")), risks: str(kv(rn, "Risks")), procurementStatus: str(kv(rn, "Procurement status")), plannedActions: str(kv(rn, "Planned actions")) };
  const hasRenewal = Object.values(renewal).some((v) => v != null);

  const gr = wb.getWorksheet("8. Growth");
  const growth = { triggers: str(kv(gr, "Triggers")), targetValue: num(kv(gr, "Target value")), narrative: str(kv(gr, "Narrative")) };
  const hasGrowth = Object.values(growth).some((v) => v != null);

  const studyCodes = readTable(wb.getWorksheet("9. Links"), ["VE study code"], "e.g. VE-2026-014").map((r) => str(r["VE study code"])).filter(Boolean) as string[];
  const trackCodes = readTable(wb.getWorksheet("9. Links"), ["VR track code"], "e.g. VR-2026-014").map((r) => str(r["VR track code"])).filter(Boolean) as string[];

  const code = FORCE_CODE ?? (await nextCode("CS"));
  const existing = await prisma.customerSuccessEngagement.findUnique({ where: { code }, select: { id: true } });
  const healthOverall = health ? ragFor(health.overall) : "GREEN";
  const title = accountName;
  const plan = {
    code, accountName, industryKey, currency, healthOverall,
    status: str(kv(acc, "Status")) ?? "ACTIVE",
    counts: { stagesSet: Object.keys(stageStatus).length, stakeholders: stake.length, actions: acts.length, health: health ? `${health.overall}/100` : "none", renewalPlan: hasRenewal, growthPlan: hasGrowth, linkStudies: studyCodes.length, linkTracks: trackCodes.length },
  };
  if (DRY) return { kind, entity: "engagement", code, title, plan, existingId: existing?.id };
  if (existing) throw new Error(`Code ${code} already exists — choose Replace to overwrite, or import as a new engagement.`);

  const ownerId = await resolveOwner("CUSTOMER_SUCCESS_MANAGER");
  const eng = await prisma.customerSuccessEngagement.create({
    data: {
      code, accountName, industryKey, currency, ownerId, organizationId: ORG_ID,
      status: (str(kv(acc, "Status")) as never) ?? "ACTIVE", healthOverall: healthOverall as never,
      arr: num(kv(acc, "ARR")), renewalDate: date(str(kv(acc, "Renewal date"))) ?? renewal.renewalDate,
      startedAt: date(str(kv(acc, "Start date"))) ?? new Date(),
      objectives,
      successPlan: (successPlan.successCriteria || successPlan.commitments || successPlan.notes ? successPlan : undefined) as Prisma.InputJsonValue | undefined,
      stages: { create: CS_STAGES.map((s) => ({ stage: s.key as never, order: s.order, status: (stageStatus[s.key] ?? "NOT_STARTED") as never })) },
    },
  });
  for (const s of stake) if (str(s["Name"])) await prisma.stakeholder.create({ data: { engagementId: eng.id, name: String(s["Name"]), title: str(s["Title"]), role: str(s["Role"]), influence: num(s["Influence (1–5)"]) ?? undefined, sentiment: (str(s["Sentiment"]) as never) ?? "NEUTRAL", notes: str(s["Notes"]) } });
  for (const a of acts) if (str(a["Title"])) await prisma.actionItem.create({ data: { engagementId: eng.id, title: String(a["Title"]), owner: str(a["Owner"]), dueDate: date(a["Due"]), status: (str(a["Status"]) as never) ?? "OPEN" } });
  if (health) await prisma.healthScore.create({ data: { engagementId: eng.id, periodLabel: health.periodLabel, periodDate: new Date(), overall: health.overall, factors: health.factors as unknown as Prisma.InputJsonValue, note: health.note } });
  if (hasRenewal) await prisma.renewalPlan.create({ data: { engagementId: eng.id, ...renewal } });
  if (hasGrowth) await prisma.growthPlan.create({ data: { engagementId: eng.id, ...growth } });
  for (const c of studyCodes) { const st = await prisma.study.findFirst({ where: { code: c, organizationId: ORG_ID }, select: { id: true } }); if (st) await prisma.study.update({ where: { id: st.id }, data: { engagementId: eng.id } }); }
  for (const c of trackCodes) { const tr = await prisma.realizationTrack.findFirst({ where: { code: c, organizationId: ORG_ID }, select: { id: true } }); if (tr) await prisma.realizationTrack.update({ where: { id: tr.id }, data: { engagementId: eng.id } }); }
  await prisma.auditEvent.create({ data: { action: "engagement.imported", entityType: "CustomerSuccessEngagement", entityId: eng.id, actorId: ownerId, metadata: { source: "workbook-import" } } });
  return { kind, entity: "engagement", code, title, plan, entityId: eng.id };
}

/** FK-safe delete of a study / track / engagement by code (used by "Replace"). */
export async function deleteByCode(code: string, orgId: string, prisma: Db): Promise<boolean> {
  const track = await prisma.realizationTrack.findFirst({ where: { code, organizationId: orgId }, select: { id: true } });
  if (track) { await prisma.realizationTrack.delete({ where: { id: track.id } }); return true; }
  const study = await prisma.study.findFirst({ where: { code, organizationId: orgId }, select: { id: true } });
  if (study) { await prisma.study.delete({ where: { id: study.id } }); return true; }
  const eng = await prisma.customerSuccessEngagement.findFirst({ where: { code, organizationId: orgId }, select: { id: true } });
  if (eng) {
    await prisma.study.updateMany({ where: { engagementId: eng.id }, data: { engagementId: null } });
    await prisma.realizationTrack.updateMany({ where: { engagementId: eng.id }, data: { engagementId: null } });
    await prisma.customerSuccessEngagement.delete({ where: { id: eng.id } });
    return true;
  }
  return false;
}
