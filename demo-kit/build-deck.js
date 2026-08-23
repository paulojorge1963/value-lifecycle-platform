const pptxgen = require("pptxgenjs");

// ── Palette (Value Lifecycle Platform — VE blue, VR emerald) ──────────────
const INK = "0F172A";
const BLUE = "2563EB";      // VE
const BLUEB = "60A5FA";     // light blue accent (on dark)
const BLUE_MIST = "EFF6FF"; // light blue card tint
const EMER = "059669";      // VR
const EMERB = "34D399";     // light emerald accent (on dark)
const EMER_MIST = "ECFDF5"; // light emerald card tint
const MUTED = "64748B";
const DARK = "0B1220";      // deep ink for dark slides
const CARD_DK = "16233B";   // card on dark
const WHITE = "FFFFFF";
const LIGHT = "CBD5E1";     // muted light for dark-slide subtext

const HFONT = "Cambria";
const BFONT = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "Value Lifecycle Platform";
pres.title = "Value Lifecycle Platform — Solution Overview";

const W = 13.33;
const MX = 0.7;
const CW = W - MX * 2;

function shadow() {
  return { type: "outer", color: "0F172A", opacity: 0.16, blur: 6, offset: 2, angle: 90 };
}
function sectionLabel(slide, text, color = BLUE) {
  slide.addText(text.toUpperCase(), {
    x: MX, y: 0.55, w: CW, h: 0.3, margin: 0,
    fontFace: BFONT, fontSize: 13, bold: true, color, charSpacing: 2,
  });
}
function heading(slide, text, opts = {}) {
  slide.addText(text, {
    x: MX, y: 0.9, w: CW, h: 1.1, margin: 0, valign: "top",
    fontFace: HFONT, fontSize: opts.size || 34, bold: true,
    color: opts.color || INK, ...opts,
  });
}
function card(slide, x, y, w, h, fill = WHITE, radius = 0.12) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill }, line: { color: fill === WHITE ? "E5E7EB" : fill, width: 1 },
    shadow: shadow(),
  });
}
function numberDot(slide, x, y, label, d = 0.52, bg = BLUE) {
  slide.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg } });
  slide.addText(label, {
    x, y, w: d, h: d, margin: 0, align: "center", valign: "middle",
    fontFace: HFONT, fontSize: 18, bold: true, color: WHITE,
  });
}
function bg(slide, color) { slide.background = { color }; }

// ── 1. Title (dark) ───────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, DARK);
  // motif: two interlocking rings — VE blue + VR emerald
  s.addShape(pres.ShapeType.ellipse, { x: 11.0, y: 0.7, w: 1.5, h: 1.5, fill: { color: DARK }, line: { color: BLUEB, width: 3 } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.55, y: 0.9, w: 1.5, h: 1.5, fill: { color: DARK }, line: { color: EMERB, width: 3 } });
  s.addText("Value Lifecycle Platform", { x: MX, y: 2.35, w: 11.5, h: 1.1, margin: 0, fontFace: HFONT, fontSize: 52, bold: true, color: WHITE });
  s.addText("From approved value to proven value.", { x: MX, y: 3.6, w: 11, h: 0.6, margin: 0, fontFace: BFONT, fontSize: 24, color: BLUEB });
  s.addText(
    "One workspace runs both roles — the value engineer who finds and quantifies value, and the realization manager who implements and proves it — with a first-class handover so nothing is lost between them.",
    { x: MX, y: 4.35, w: 10.5, h: 1.1, margin: 0, fontFace: BFONT, fontSize: 16, color: LIGHT, lineSpacingMultiple: 1.2 }
  );
  s.addText("SOLUTION OVERVIEW", { x: MX, y: 6.7, w: 6, h: 0.3, margin: 0, fontFace: BFONT, fontSize: 12, bold: true, color: EMERB, charSpacing: 3 });
  s.addNotes("The platform runs the whole value lifecycle in one place. Opening line: organisations approve value they then can't prove — this closes that loop.");
}

// ── 2. The problem ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "The problem");
  heading(s, "Organisations approve value\nthey can't prove.", { size: 33 });
  s.addText(
    "The study lives in one team's deck. The realization lives in another team's spreadsheet. The link between them is an email thread — so when the board asks whether the approved savings ever showed up, nobody can answer with a number.",
    { x: MX, y: 2.9, w: 6.6, h: 2, margin: 0, fontFace: BFONT, fontSize: 17, color: MUTED, lineSpacingMultiple: 1.2 }
  );
  card(s, 8.0, 2.55, 4.63, 3.6, BLUE_MIST);
  s.addText("Where value leaks", { x: 8.35, y: 2.85, w: 4, h: 0.4, margin: 0, fontFace: HFONT, fontSize: 18, bold: true, color: BLUE });
  const skipped = [
    "Business case approved, then filed away",
    "No baseline to measure against",
    "Realization tracked in a different tool",
    "QBRs tell a story, not a reconciliation",
  ];
  s.addText(
    skipped.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: INK, breakLine: i < skipped.length - 1, paraSpaceAfter: 10 } })),
    { x: 8.35, y: 3.4, w: 3.95, h: 2.6, margin: 0, fontFace: BFONT, fontSize: 15 }
  );
}

// ── 3. The solution ───────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "The solution");
  heading(s, "Two roles. One workspace. A first-class handover.");
  const cards = [
    ["1", "Engineer the value", "An 8-phase VE Job Plan: analyse functions, generate and score alternatives, and build a quantified business case.", BLUE],
    ["2", "Hand it over", "One click turns accepted recommendations into a realization track — work packages, benefits and KPIs seeded from the study.", INK],
    ["3", "Realize & prove it", "A 7-phase lifecycle drives adoption and measures actuals against baseline — realized value that traces back to the case.", EMER],
  ];
  const cw = 3.85, gap = (CW - cw * 3) / 2;
  cards.forEach(([n, h, d, col], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 2.5, cw, 3.5, WHITE);
    numberDot(s, x + 0.35, 2.85, n, 0.52, col);
    s.addText(h, { x: x + 0.35, y: 3.55, w: cw - 0.7, h: 0.5, margin: 0, fontFace: HFONT, fontSize: 20, bold: true, color: INK });
    s.addText(d, { x: x + 0.35, y: 4.15, w: cw - 0.7, h: 1.7, margin: 0, fontFace: BFONT, fontSize: 15, color: MUTED, lineSpacingMultiple: 1.15 });
  });
}

// ── 4. The lifecycle ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "How it works");
  heading(s, "The whole value lifecycle, guided end to end.");
  // VE card
  card(s, MX, 2.5, 5.35, 3.7, BLUE_MIST);
  s.addShape(pres.ShapeType.roundRect, { x: MX, y: 2.5, w: 5.35, h: 0.6, rectRadius: 0.12, fill: { color: BLUE } });
  s.addText("Value Engineer · 8-phase VE Job Plan", { x: MX, y: 2.5, w: 5.35, h: 0.6, margin: 0, align: "center", valign: "middle", fontFace: HFONT, fontSize: 15, bold: true, color: WHITE });
  s.addText(
    ["Orientation & Information", "Function analysis + FAST", "Creative alternatives", "Evaluation (weighted scoring)", "Development & business case", "Presentation → accept/reject", "Handover"].map((t, j, a) => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, color: INK, breakLine: j < a.length - 1, paraSpaceAfter: 6 } })),
    { x: MX + 0.3, y: 3.35, w: 4.8, h: 2.7, margin: 0, fontFace: BFONT, fontSize: 13.5 }
  );
  // handover chip
  s.addShape(pres.ShapeType.roundRect, { x: 6.35, y: 4.0, w: 0.63, h: 0.7, rectRadius: 0.1, fill: { color: WHITE }, line: { color: "D97706", width: 1.5 } });
  s.addText("→", { x: 6.35, y: 4.0, w: 0.63, h: 0.7, margin: 0, align: "center", valign: "middle", fontFace: BFONT, fontSize: 22, bold: true, color: "D97706" });
  // VR card
  card(s, 7.28, 2.5, 5.35, 3.7, EMER_MIST);
  s.addShape(pres.ShapeType.roundRect, { x: 7.28, y: 2.5, w: 5.35, h: 0.6, rectRadius: 0.12, fill: { color: EMER } });
  s.addText("Realization Manager · 7-phase lifecycle", { x: 7.28, y: 2.5, w: 5.35, h: 0.6, margin: 0, align: "center", valign: "middle", fontFace: HFONT, fontSize: 15, bold: true, color: WHITE });
  s.addText(
    ["Intake & alignment", "Baseline & measurement", "Implementation planning", "Adoption & change", "Execution & monitoring", "Value tracking & reporting", "Close-out"].map((t, j, a) => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, color: INK, breakLine: j < a.length - 1, paraSpaceAfter: 6 } })),
    { x: 7.58, y: 3.35, w: 4.8, h: 2.7, margin: 0, fontFace: BFONT, fontSize: 13.5 }
  );
  s.addText("Every phase teaches, with exit criteria as a quality gate.", { x: MX, y: 6.35, w: CW, h: 0.4, margin: 0, align: "center", fontFace: BFONT, fontSize: 13, italic: true, color: MUTED });
}

// ── 5. Value engineering method ───────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "Value engineering");
  heading(s, "Find the value the classic way — then quantify it.");
  const mods = [
    ["Function analysis + FAST", "Verb-noun functions with cost vs worth; a value index flags where you overspend, drawn as a FAST logic tree."],
    ["Creative alternatives", "Generate ways to deliver each function — type your own or brainstorm a spread (AI or template)."],
    ["Evaluation matrix", "Weighted criteria, 1–5 scoring, live rank; change a weight and everything re-ranks."],
    ["Recommendations", "Promote shortlisted ideas to recommendations with technical and commercial detail."],
    ["Business case", "Cost/benefit line items; ROI, payback, NPV & IRR recompute live; multi-currency (ZAR default)."],
    ["Value handover pack", "Baselines, KPI definitions and success criteria — what realization will be measured against."],
  ];
  const cw = 3.85, ch = 1.75, gapx = (CW - cw * 3) / 2, gapy = 0.3;
  mods.forEach(([h, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = MX + col * (cw + gapx), y = 2.55 + row * (ch + gapy);
    card(s, x, y, cw, ch, i % 2 === 0 ? WHITE : BLUE_MIST);
    s.addText(h, { x: x + 0.3, y: y + 0.22, w: cw - 0.6, h: 0.6, margin: 0, fontFace: HFONT, fontSize: 15.5, bold: true, color: BLUE });
    s.addText(d, { x: x + 0.3, y: y + 0.82, w: cw - 0.6, h: 0.85, margin: 0, fontFace: BFONT, fontSize: 12.5, color: MUTED, lineSpacingMultiple: 1.1 });
  });
}

// ── 6. The business case / finance engine ─────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "The business case");
  heading(s, "A live business case, not a static spreadsheet.");
  s.addText(
    "Add cost and benefit line items — CAPEX, OPEX, one-off, recurring, benefits — and the finance engine recomputes the headline numbers instantly. Snapshot a version before a big edit; export a board-ready document to Word.",
    { x: MX, y: 2.7, w: 6.3, h: 1.8, margin: 0, fontFace: BFONT, fontSize: 17, color: MUTED, lineSpacingMultiple: 1.2 }
  );
  const metrics = ["ROI", "Payback", "NPV", "IRR", "Life-cycle cost"];
  s.addText(
    metrics.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: INK, bold: true, breakLine: i < metrics.length - 1, paraSpaceAfter: 8 } })),
    { x: MX, y: 4.6, w: 6, h: 1.8, margin: 0, fontFace: BFONT, fontSize: 15 }
  );
  // right: computed / deterministic card
  card(s, 7.55, 2.55, 5.08, 2.0, BLUE_MIST);
  s.addText("Computed, not typed", { x: 7.85, y: 2.8, w: 4.5, h: 0.4, margin: 0, fontFace: HFONT, fontSize: 17, bold: true, color: BLUE });
  s.addText("The finance engine is authoritative — every figure is derived from the line items, so the case is always internally consistent.", { x: 7.85, y: 3.25, w: 4.5, h: 1.2, margin: 0, fontFace: BFONT, fontSize: 14, color: INK, lineSpacingMultiple: 1.15 });
  // big stat
  card(s, 7.55, 4.75, 5.08, 1.65, DARK);
  s.addText("ZAR", { x: 7.75, y: 4.95, w: 2.0, h: 1.2, margin: 0, valign: "middle", fontFace: HFONT, fontSize: 40, bold: true, color: EMERB });
  s.addText("default currency —\nswitchable per business case.", { x: 9.55, y: 4.95, w: 2.9, h: 1.2, margin: 0, valign: "middle", fontFace: BFONT, fontSize: 14, color: WHITE });
}

// ── 7. The handover (dark, marquee) ───────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, DARK);
  sectionLabel(s, "The handover", BLUEB);
  heading(s, "One click turns approved value into owned work.", { color: WHITE });
  s.addText(
    "With at least one reviewer-accepted recommendation, Create Value Realization Track spins up a linked track and pre-populates it from the study. Nothing is re-keyed.",
    { x: MX, y: 2.55, w: 11.5, h: 0.9, margin: 0, fontFace: BFONT, fontSize: 17, color: LIGHT, lineSpacingMultiple: 1.2 }
  );
  const seeded = [
    ["Work packages", "from the accepted recommendations"],
    ["Benefits", "from the expected-benefit artifacts"],
    ["KPI targets", "from KPI artifacts, with baselines"],
    ["Back-link", "track → source study, audit logged"],
  ];
  const cw = 2.85, gap = (CW - cw * 4) / 3;
  seeded.forEach(([h, d], i) => {
    const x = MX + i * (cw + gap);
    s.addShape(pres.ShapeType.roundRect, { x, y: 3.7, w: cw, h: 2.4, rectRadius: 0.12, fill: { color: CARD_DK }, line: { color: i === 3 ? EMER : BLUE, width: 1 } });
    s.addText(h, { x: x + 0.3, y: 4.0, w: cw - 0.6, h: 0.5, margin: 0, fontFace: HFONT, fontSize: 17, bold: true, color: i === 3 ? EMERB : BLUEB });
    s.addText(d, { x: x + 0.3, y: 4.6, w: cw - 0.6, h: 1.3, margin: 0, fontFace: BFONT, fontSize: 13.5, color: LIGHT, lineSpacingMultiple: 1.2 });
  });
  s.addNotes("This is the marquee. The handover is the whole point of the product: the required link between approved value and committed, measurable work.");
}

// ── 8. Value realization ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "Value realization", EMER);
  heading(s, "Implement it, adopt it, and measure what lands.");
  const mods = [
    ["Work packages", "The implementation WBS — owners, due dates, status, dependencies."],
    ["Adoption & change", "Who's impacted, training, comms and champions — recommendations become owned work."],
    ["KPI tracker", "Record actuals each period against the baselines and targets carried from handover."],
    ["Benefits realization", "Edit realized value per benefit; it rolls up to the track and the portfolio."],
    ["Value reports / QBR", "Periodic and quarterly packs, exported to Word."],
    ["Close-out & lessons", "Final realized value vs the original business case; lessons feed back to VE."],
  ];
  const cw = 3.85, ch = 1.75, gapx = (CW - cw * 3) / 2, gapy = 0.3;
  mods.forEach(([h, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = MX + col * (cw + gapx), y = 2.55 + row * (ch + gapy);
    card(s, x, y, cw, ch, i % 2 === 0 ? EMER_MIST : WHITE);
    s.addText(h, { x: x + 0.3, y: y + 0.22, w: cw - 0.6, h: 0.6, margin: 0, fontFace: HFONT, fontSize: 15.5, bold: true, color: EMER });
    s.addText(d, { x: x + 0.3, y: y + 0.82, w: cw - 0.6, h: 0.85, margin: 0, fontFace: BFONT, fontSize: 12.5, color: MUTED, lineSpacingMultiple: 1.1 });
  });
}

// ── 9. Prove it (portfolio) ───────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "Prove it");
  heading(s, "Planned value vs realized value — in one view.");
  s.addText(
    "The portfolio dashboard puts the engineers' planned value beside the managers' realized value, broken down by industry and health. Realized value is measured against the baselines set at handover — so the number is a reconciliation, not a story.",
    { x: MX, y: 2.7, w: 6.4, h: 2, margin: 0, fontFace: BFONT, fontSize: 17, color: MUTED, lineSpacingMultiple: 1.2 }
  );
  // two big stat cards
  card(s, 7.5, 2.6, 2.55, 1.9, BLUE_MIST);
  s.addText("Planned", { x: 7.5, y: 2.8, w: 2.55, h: 0.4, margin: 0, align: "center", fontFace: BFONT, fontSize: 13, bold: true, color: BLUE });
  s.addText("VE", { x: 7.5, y: 3.15, w: 2.55, h: 1.0, margin: 0, align: "center", fontFace: HFONT, fontSize: 40, bold: true, color: BLUE });
  s.addText("from business cases", { x: 7.5, y: 4.12, w: 2.55, h: 0.4, margin: 0, align: "center", fontFace: BFONT, fontSize: 11, color: MUTED });
  card(s, 10.08, 2.6, 2.55, 1.9, EMER_MIST);
  s.addText("Realized", { x: 10.08, y: 2.8, w: 2.55, h: 0.4, margin: 0, align: "center", fontFace: BFONT, fontSize: 13, bold: true, color: EMER });
  s.addText("VR", { x: 10.08, y: 3.15, w: 2.55, h: 1.0, margin: 0, align: "center", fontFace: HFONT, fontSize: 40, bold: true, color: EMER });
  s.addText("from KPI actuals", { x: 10.08, y: 4.12, w: 2.55, h: 0.4, margin: 0, align: "center", fontFace: BFONT, fontSize: 11, color: MUTED });
  card(s, 7.5, 4.7, 5.13, 1.7, DARK);
  s.addText("“Did we get the savings we approved?”", { x: 7.8, y: 4.95, w: 4.6, h: 0.5, margin: 0, fontFace: HFONT, fontSize: 16, bold: true, color: WHITE });
  s.addText("A single number, traceable all the way back to the study.", { x: 7.8, y: 5.5, w: 4.6, h: 0.7, margin: 0, fontFace: BFONT, fontSize: 13.5, color: LIGHT });
}

// ── 9b. Customer Success (continuing relationship) ────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "Customer Success", EMERB);
  heading(s, "Proven value → a retained, growing relationship.");
  s.addText("Realization proves one initiative and closes out; Customer Success is the continuous, per-account layer — and it references the account's studies and tracks, it never duplicates their value.", { x: MX, y: 2.15, w: CW, h: 0.7, margin: 0, fontFace: BFONT, fontSize: 15, color: MUTED, lineSpacingMultiple: 1.15 });
  const cards = [
    ["8-stage lifecycle", "Handover → onboarding → adoption → value → health → governance → renewal → expansion."],
    ["Health, proactively", "A weighted scorecard rolls up to a RAG band; attention signals flag renewals, risk and detractors."],
    ["Renewal & growth", "Stakeholder map, action log, renewal and growth plans — renewal becomes a non-event."],
    ["AI-assisted EBR", "Generate an executive review from the account's own data; export an Account Success Review."],
  ];
  const cw = 2.9, gap = (CW - cw * 4) / 3;
  cards.forEach(([h, d], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 3.05, cw, 2.9, i % 2 === 0 ? EMER_MIST : BLUE_MIST);
    s.addText(h, { x: x + 0.3, y: 3.35, w: cw - 0.6, h: 0.8, margin: 0, fontFace: HFONT, fontSize: 16, bold: true, color: i % 2 === 0 ? EMER : BLUE });
    s.addText(d, { x: x + 0.3, y: 4.15, w: cw - 0.6, h: 1.7, margin: 0, fontFace: BFONT, fontSize: 12.5, color: MUTED, lineSpacingMultiple: 1.15 });
  });
  s.addText("The portfolio gains a Customer Success lens — engagement health, upcoming renewals and accounts needing attention.", { x: MX, y: 6.2, w: CW, h: 0.5, margin: 0, align: "center", fontFace: BFONT, fontSize: 13, italic: true, color: MUTED });
}

// ── 10. Industry profiles ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "Configurable");
  heading(s, "Three industries out of the box — configuration, not code.");
  const who = [
    ["Construction & Infrastructure", "Capital projects, life-cycle cost, buildability — value engineering's home turf."],
    ["Manufacturing & Product Dev", "Should-cost, DFMA, tooling and unit-cost levers across a product line."],
    ["Enterprise Software / SaaS", "Adoption, cost-to-serve and efficiency benefits for digital initiatives."],
  ];
  const cw = 3.85, gap = (CW - cw * 3) / 2;
  who.forEach(([h, d], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 2.6, cw, 2.9, BLUE_MIST);
    s.addText(h, { x: x + 0.35, y: 2.95, w: cw - 0.7, h: 0.9, margin: 0, fontFace: HFONT, fontSize: 17, bold: true, color: BLUE });
    s.addText(d, { x: x + 0.35, y: 3.95, w: cw - 0.7, h: 1.4, margin: 0, fontFace: BFONT, fontSize: 14.5, color: INK, lineSpacingMultiple: 1.2 });
  });
  s.addText("Each profile adds study types, cost drivers, value levers and default KPIs — add a new one in a data file and re-seed; the engine never changes.", { x: MX, y: 5.75, w: CW, h: 0.6, margin: 0, align: "center", fontFace: BFONT, fontSize: 14, italic: true, color: MUTED });
}

// ── 11. Governance & enterprise (dark) ────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, DARK);
  sectionLabel(s, "Governance & enterprise", EMERB);
  heading(s, "Separation of duties, enforced — and multi-tenant.", { color: WHITE });
  const cards = [
    ["Role-based access", "Value Engineer, Realization Manager, Customer Success Manager, Reviewer, Viewer, Admin — capabilities enforced on the server, not just hidden in the UI."],
    ["A real governance gate", "Only reviewer-accepted recommendations can be handed over — the line between proposed and committed value."],
    ["Multi-tenant & auditable", "Self-serve workspaces isolated by organisation; version history and an audit log keep every number defensible."],
  ];
  const cw = 3.85, gap = (CW - cw * 3) / 2;
  cards.forEach(([h, d], i) => {
    const x = MX + i * (cw + gap);
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.6, w: cw, h: 3.4, rectRadius: 0.12, fill: { color: CARD_DK }, line: { color: i === 2 ? EMER : BLUE, width: 1 } });
    s.addText(h, { x: x + 0.35, y: 2.95, w: cw - 0.7, h: 0.8, margin: 0, fontFace: HFONT, fontSize: 19, bold: true, color: i === 2 ? EMERB : BLUEB });
    s.addText(d, { x: x + 0.35, y: 3.85, w: cw - 0.7, h: 2.0, margin: 0, fontFace: BFONT, fontSize: 15, color: LIGHT, lineSpacingMultiple: 1.2 });
  });
}

// ── 12. What's built (stats) ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "The platform");
  heading(s, "A complete platform, already built.");
  const stats = [["8·7·8", "VE · VR · CS phases"], ["3", "linked pillars"], ["5", "finance metrics"], ["100%", "tenant-isolated"]];
  const cw = 2.75, gap = (CW - cw * 4) / 3;
  stats.forEach(([n, l], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 2.55, cw, 1.7, i % 2 === 0 ? BLUE_MIST : EMER_MIST);
    s.addText(n, { x, y: 2.7, w: cw, h: 0.85, margin: 0, align: "center", fontFace: HFONT, fontSize: 36, bold: true, color: i % 2 === 0 ? BLUE : EMER });
    s.addText(l, { x, y: 3.55, w: cw, h: 0.5, margin: 0, align: "center", fontFace: BFONT, fontSize: 13, color: MUTED });
  });
  s.addText("What ships today:", { x: MX, y: 4.6, w: CW, h: 0.4, margin: 0, fontFace: HFONT, fontSize: 16, bold: true, color: INK });
  const rel = [
    "VE Job Plan — function analysis, FAST diagram, weighted evaluation matrix, inline editing throughout",
    "Business case — live finance engine (ROI/payback/NPV/IRR/LCC), multi-currency, version history, Word export",
    "The first-class VE→VR handover — accepted recommendations become a seeded realization track",
    "Realization lifecycle — work packages, adoption plan, KPI tracker, benefits realization, VRP/QBR export",
    "Customer Success — per-account engagements, 8-stage lifecycle, health scorecard, renewal/growth plans, AI-assisted EBRs",
    "Platform — portfolio & KPI dashboards (with a CS lens), real Auth.js RBAC, self-service workspaces + admin team management",
  ];
  s.addText(
    rel.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 16 }, color: MUTED, breakLine: i < rel.length - 1, paraSpaceAfter: 6 } })),
    { x: MX, y: 5.05, w: CW, h: 2.0, margin: 0, fontFace: BFONT, fontSize: 13.5 }
  );
}

// ── 13. Who it's for ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, WHITE);
  sectionLabel(s, "Who it's for");
  heading(s, "For the people who own the value — and have to prove it.");
  const who = [
    ["Value engineering teams", "Run structured studies and build defensible business cases in one place."],
    ["Transformation & PMOs", "A portfolio view of planned vs realized value across every initiative."],
    ["Finance & sponsors", "The reconciliation the board asks for — approved value against proven value."],
  ];
  const cw = 3.85, gap = (CW - cw * 3) / 2;
  who.forEach(([h, d], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 2.6, cw, 3.3, i === 1 ? BLUE : WHITE);
    const sub = i === 1 ? LIGHT : MUTED;
    s.addText(h, { x: x + 0.35, y: 3.0, w: cw - 0.7, h: 0.9, margin: 0, fontFace: HFONT, fontSize: 20, bold: true, color: i === 1 ? WHITE : BLUE });
    s.addText(d, { x: x + 0.35, y: 3.95, w: cw - 0.7, h: 1.8, margin: 0, fontFace: BFONT, fontSize: 15, color: sub, lineSpacingMultiple: 1.2 });
  });
}

// ── 14. Close (dark) ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  bg(s, DARK);
  s.addShape(pres.ShapeType.ellipse, { x: 10.85, y: 5.15, w: 1.5, h: 1.5, fill: { color: DARK }, line: { color: BLUEB, width: 3 } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.4, y: 5.35, w: 1.5, h: 1.5, fill: { color: DARK }, line: { color: EMERB, width: 3 } });
  s.addText("Approved value, and\nproven value — linked.", { x: MX, y: 2.3, w: 11, h: 1.8, margin: 0, fontFace: HFONT, fontSize: 40, bold: true, color: WHITE, lineSpacingMultiple: 1.05 });
  s.addText("Where is that link weakest in your organisation today?", { x: MX, y: 4.35, w: 10, h: 0.6, margin: 0, fontFace: BFONT, fontSize: 20, color: BLUEB });
  s.addText("Value Lifecycle Platform", { x: MX, y: 6.6, w: 6, h: 0.4, margin: 0, fontFace: HFONT, fontSize: 16, bold: true, color: WHITE });
  s.addNotes("Close on the loop: approved value and proven value, joined by a first-class handover. Invite the discussion on where that link is weakest.");
}

pres.writeFile({ fileName: "demo-kit/ValueLifecycle-Solution-Overview.pptx" }).then((f) => console.log("wrote", f));
