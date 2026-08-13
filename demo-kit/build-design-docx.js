// Build the design document as .docx with the diagrams embedded as images.
// Value Lifecycle Platform — VE blue accent.
const fs = require("fs");
const sharp = require("sharp");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require("docx");

const D = "demo-kit/diagrams";
const BLUE = "2563EB", INK = "0F172A", GREY = "64748B";
const CW = 9360; // content width DXA (Letter, 1" margins)

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 }, children: [new TextRun({ text: t, color: BLUE })] });
const P = (runs, opts = {}) => new Paragraph({ spacing: { after: 120, line: 264 }, children: Array.isArray(runs) ? runs : [new TextRun(runs)], ...opts });
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: inline(t) });

// inline **bold** and `code`
function inline(text) {
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const out = []; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun(text.slice(last, m.index)));
    if (m[2] !== undefined) out.push(new TextRun({ text: m[2], bold: true }));
    else out.push(new TextRun({ text: m[3], font: "Consolas", color: "B91C1C" }));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(new TextRun(text.slice(last)));
  return out.length ? out : [new TextRun(text)];
}

async function img(name, displayW) {
  const p = `${D}/${name}.png`;
  const meta = await sharp(p).metadata();
  const height = Math.round(displayW * meta.height / meta.width);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 180 },
    children: [new ImageRun({ type: "png", data: fs.readFileSync(p), transformation: { width: displayW, height } })],
  });
}

function principlesTable() {
  const rows = [
    ["The handover is first-class", "Every realization track has a required link to its source study; work packages, benefits and KPI targets are seeded from the study — nothing is re-keyed."],
    ["One source of truth", "Function analysis, business case, baselines and KPIs are entered once and drive every register, document and report."],
    ["Separation of duties", "The engineer builds, a reviewer approves, the manager realizes — role capabilities enforced on the server, not just hidden in the UI."],
    ["Prove it against a baseline", "Realized value is measured against baselines captured at handover; versions and an audit log keep the reconciliation honest."],
    ["Industry is configuration", "Study types, cost drivers, value levers and default KPIs live as seeded data — add an industry without touching the engine."],
    ["Deterministic finance", "ROI, payback, NPV, IRR and life-cycle cost are computed in code; the finance engine is authoritative."],
    ["AI proposes, human disposes", "AI produces starter text only, with a template fallback; the product is fully usable with AI switched off."],
  ];
  const c0 = 3100, c1 = CW - c0;
  const cell = (t, header, w) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "EFF6FF" } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ children: header ? [new TextRun({ text: t, bold: true, color: BLUE })] : inline(t) })],
  });
  return new Table({
    columnWidths: [c0, c1],
    width: { size: CW, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: [cell("Principle", true, c0), cell("What it means in the product", true, c1)] }),
      ...rows.map(([a, b]) => new TableRow({ children: [cell(a, false, c0), cell(b, false, c1)] })),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" }, right: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "EEF2F8" }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "EEF2F8" },
    },
  });
}

(async () => {
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 80 }, children: [new TextRun({ text: "Value Lifecycle Platform — Solution Design Document", color: BLUE })] }),
    P([new TextRun({ text: "One workspace for the whole value lifecycle — a value engineer who finds and quantifies value, and a realization manager who implements and proves it. This document explains the design and shows the workflow and architecture as diagrams.", italics: true, color: GREY })]),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "DBE3F0", space: 1 } }, spacing: { after: 160 }, children: [] }),

    H1("1. Purpose"),
    P("Organisations are good at identifying value — value-engineering studies, business cases, board approvals — and poor at proving it was ever realized. The study lives in one team's deck; the realization lives in another team's spreadsheet; the link between them is an email thread. The Value Lifecycle Platform closes that loop by running both roles in one system and making the handover between them first-class."),
    P([new TextRun({ text: "Two complementary roles, two structured methods: ", }), new TextRun({ text: "the Value Engineer runs an 8-phase VE Job Plan; the Value Realization Manager runs a 7-phase realization lifecycle. ", bold: true }), new TextRun("Every realization track traces back to the study, business case and success criteria it came from.")]),

    H1("2. The value lifecycle"),
    P("A piece of work moves from a framed problem, through a quantified business case and a governance gate, into implementation and proof of realized value. The platform turns that lifecycle into a guided sequence, teaching at each phase and using each phase's exit criteria as a quality gate."),
    await img("1-value-lifecycle", 620),
    P("The engineering side ends where the realization side begins — at the handover. The two are deliberately different methods, joined by one required link."),

    H1("3. Industry as configuration"),
    P("The workflow is data-driven, not hard-coded. The core engine — the 8 VE and 7 VR phases, the deliverables, the finance engine and the KPI catalogue — is the same for everyone. An industry profile layers on the study types, cost drivers, value levers and default KPIs that make a study feel native to that sector."),
    await img("2-industry-config", 600),
    P([new TextRun({ text: "Adding an industry means editing a TypeScript module in ", }), new TextRun({ text: "src/lib/domain/", font: "Consolas", color: "B91C1C" }), new TextRun(" and re-seeding — construction, manufacturing and SaaS ship out of the box. The engine never changes.")]),

    H1("4. From data to documents"),
    P("Function analysis, the business case, work packages, benefits and KPIs are entered once. The finance and export engine turns that live data into the deliverables leadership actually asks for — a board-ready business case, a Value Realization Plan / QBR pack, and a KPI workbook."),
    await img("3-data-to-documents", 440),
    P("Because documents are generated from live data they always reflect the current state — regenerate before a steering meeting and the pack is up to date. ROI, payback, NPV, IRR and life-cycle cost are computed deterministically in the finance engine, not typed by hand."),

    H1("5. The handover — the marquee flow"),
    P("This is the point of the product. From a study with at least one accepted recommendation, one action creates a linked realization track and pre-populates it from the study."),
    await img("5-handover", 620),
    bullet("**Guarded:** the handover requires at least one reviewer-**accepted** recommendation — the governance gate between proposed and committed value."),
    bullet("**Seeded, not re-keyed:** work packages come from the recommendations, benefits from the expected-benefit artifacts, KPI targets (with baselines) from the KPI artifacts, and success criteria carry across."),
    bullet("**Traceable:** the study is marked handed-over, an audit event is written, and the track back-links to its source study."),

    H1("6. System architecture"),
    P("A single-language, type-safe stack. Role-aware React Server Components render the dashboards; server actions and REST routes handle mutations and exports; Prisma talks to PostgreSQL through an organisation-scoped client; and the relational model holds the VE↔VR graph together."),
    await img("4-architecture", 460),
    bullet("**Role-aware UI:** `/portfolio`, `/ve`, `/vr`, `/kpis`, `/templates`; capabilities resolve from the signed-in user's role."),
    bullet("**Application layer:** server actions (create study, phase status, recommendation decisions, handover, KPI actuals) plus REST routes and the finance/export engine."),
    bullet("**AI is optional and never authoritative:** the Anthropic seam produces starter text only; the static template library is the fallback."),

    H1("7. Domain & data model"),
    P("Everything hangs off the Organisation (the tenant). On the engineering side: Study → StudyPhase → PhaseTask, FunctionItem → Alternative → Recommendation, and BusinessCase → Scenario → CostItem. On the realization side: RealizationTrack → VrPhaseInstance, WorkPackage, AdoptionPlan, Benefit, ValueReport and LessonLearned."),
    P([new TextRun({ text: "The bridge: ", bold: true }), new TextRun("a HandoverArtifact captures each expected benefit, KPI, baseline, measurement plan and success criterion on the study, and is linked to the RealizationTrack on handover. RealizationTrack carries a required foreign key to its source Study. KPIs are modelled as KpiDefinition (catalogue) → KpiTarget (on a study or track) → KpiActual (time series). Comment, AuditEvent and DocumentVersion provide governance across the model.")]),

    H1("8. Multi-tenancy, roles & governance"),
    P("Self-service registration creates a new, isolated Organisation with the signer as Admin; every study and track is scoped to its organisation. Role-based access maps each role — Value Engineer, Value Realization Manager, Reviewer, Viewer, Admin — to a capability set enforced on the server; the UI merely hides what a role can't do."),
    P("Admins manage the team from a dedicated page: add members with an initial password, change roles, reset passwords, and remove access. Removing a member who owns studies, tracks or comments reassigns that work to another member first, so nothing is orphaned. Business-case snapshots (version history) and an audit log keep the realized-vs-planned reconciliation defensible."),

    H1("9. Key design principles"),
    principlesTable(),
    P(""),

    H1("10. Technology stack"),
    bullet("**Frontend:** Next.js 15 (App Router) · React Server Components · TypeScript (strict) · Tailwind CSS (VE = blue, VR = emerald)"),
    bullet("**Application:** server actions + REST API · zod validation · finance engine (ROI · payback · NPV · IRR · LCC)"),
    bullet("**Data:** Prisma 6 · PostgreSQL — the VE↔VR relational graph"),
    bullet("**Auth:** Auth.js (NextAuth v5) credentials, JWT sessions, edge-safe middleware · capability-based RBAC"),
    bullet("**AI (optional):** Anthropic API, structured outputs, starter text with a template fallback"),
    bullet("**Exports:** docx (Word business case & VRP/QBR) · exceljs (Excel KPI workbook)"),

    H1("11. What's built"),
    P("A complete Phase-1 platform: the 8-phase VE Job Plan with function analysis, a FAST diagram, a weighted evaluation matrix and inline editing throughout; a live business-case builder with the finance engine, multi-currency (ZAR default), version history and Word export; the first-class VE→VR handover; the 7-phase realization lifecycle with work packages, adoption plan, KPI tracker and benefits realization; portfolio and KPI dashboards; three industry profiles; real Auth.js login with role-based access; and self-service registration with admin team management including owner reassignment."),
    P([new TextRun({ text: "The Value Lifecycle Platform — one workspace that turns approved value into proven value, with a first-class handover so nothing is lost between the two.", italics: true, color: GREY })]),
  ];

  const doc = new Document({
    creator: "Value Lifecycle Platform",
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: INK } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync("demo-kit/ValueLifecycle-Design-Document.docx", buf);
  console.log("wrote ValueLifecycle-Design-Document.docx");
})().catch((e) => { console.error(e); process.exit(1); });
