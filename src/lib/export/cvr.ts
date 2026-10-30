// =============================================================================
//  Collaborative Value Review (CVR) — PowerPoint builder.
//  Vendor-neutral, Blue Turtle brand. Fills the 15 VE-producible slides from a
//  completed VE study; missing fields fall back to <placeholder> text so the
//  deck is always complete and fillable.
// =============================================================================
import pptxgen from "pptxgenjs";
import { BG_CONTENT, BG_CONTENT_NOLOGO, LOGO, HERO } from "./cvr-assets";
import { fmtMoneyShort } from "@/lib/finance";

// Brand palette (Blue Turtle).
const DEEP = "0053B4", BLUE = "0284DD", TEAL = "0091A8", GREEN = "159E7A", AMBER = "E07C24";
const INK = "15303F", MUTED = "5E7789", WHITE = "FFFFFF", LIGHT = "D6EAF6", MIST = "EAF4FC", LINE = "DBE7F0";
const HF = "Calibri", BF = "Calibri";
const W = 13.33, H = 7.5, MX = 0.6, CW = W - MX * 2;

export interface CvrParticipant { name: string; title?: string | null }
export interface CvrProofPoint { value: string; label: string; description?: string }
export interface CvrInitiative { title: string; detail?: string; quote?: string }
export interface CvrDriverEnabler { driver: string; enabler: string }
export interface CvrBenefitRow { useCase: string; group: string; benefits: string }
export interface CvrUseCase { title: string; current?: string; implications?: string; future?: string; benefits?: string }
export interface CvrFinRow { label: string; cells: string[]; total?: string; emph?: boolean }
export interface CvrNextStep { area: string; detail: string }

export interface CvrData {
  customerName: string;
  studyTitle: string;
  studyCode: string;
  presenter: string;
  presenterTitle?: string;
  currency: string;
  realized: boolean; // true = figures come from a VR track (realised), false = planned (VE)
  execSummary?: string;
  whyDoSomething?: string;
  whyNow?: string;
  whyThisSolution?: string;
  whatsNext?: string;
  useCaseLine?: string;
  participants: CvrParticipant[];
  deliveryTeam?: string[];     // "Name — role" for the delivery-team column
  collabStats?: { value: string; label: string }[]; // the 4 collaboration stat chips
  proofPoints: CvrProofPoint[];
  priorities: string[][];      // up to 3 columns of bullets
  priorityQuote?: string;
  priorityQuoteBy?: string;    // attribution for the priority quote
  initiatives: CvrInitiative[];
  driversEnablers: CvrDriverEnabler[];
  benefitRows: CvrBenefitRow[];
  currentState: string[];
  implications: string[];
  futureState: string[];
  keyBenefits: string[];
  useCases: CvrUseCase[];      // per shortlisted recommendation (capped by caller)
  roiPct?: string;
  paybackMonths?: string;
  npv?: string;
  financialRows: CvrFinRow[];
  finYears: string[]; // column headers for the financial-detail table (e.g. ["Now","Yr 1",…])
  // Numeric cash-flow series for the financial-detail table & payback curve.
  cashflow?: { years: string[]; cumBenefit: number[]; cumInvestment: number[]; benefit?: number[]; cost?: number[]; net?: number[]; cumNet?: number[] };
  results: { label: string; value: string }[];
  nextSteps: CvrNextStep[];
}

const or = (v: string | undefined | null, ph: string) => (v && v.trim() ? v.trim() : ph);
// Clamp to n chars on a word boundary so long free-text fields can't overflow a fixed card.
const clamp = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "").trimEnd() + "…" : t);
const orList = (a: string[] | undefined, ph: string[], n: number) => {
  const out = (a && a.length ? a : ph).slice(0, n);
  while (out.length < Math.min(ph.length, n)) out.push(ph[out.length]);
  return out;
};

export async function buildCvr(d: CvrData): Promise<Buffer> {
  const p = new pptxgen();
  p.defineLayout({ name: "W", width: W, height: H }); p.layout = "W";
  p.author = "Blue Turtle Technologies"; p.title = `Collaborative Value Review — ${d.customerName}`;
  let PN = 0;
  const sh = () => ({ type: "outer" as const, color: "0B2540", opacity: 0.18, blur: 5, offset: 2, angle: 90 });
  // Content canvas = One-Pager-Template (light-blue header band, turtle baked bottom-right).
  // Logo-free twin for edge-to-edge slides whose own content fills that corner (e.g. the drivers table).
  const bg = (s: pptxgen.Slide) => s.addImage({ data: BG_CONTENT, x: 0, y: 0, w: W, h: H });
  const bgNoLogo = (s: pptxgen.Slide) => s.addImage({ data: BG_CONTENT_NOLOGO, x: 0, y: 0, w: W, h: H });
  const pill = (s: pptxgen.Slide, eyebrow: string, title: string) => {
    s.addText(eyebrow.toUpperCase(), { x: MX + 0.05, y: 0.14, w: 11.6, h: 0.26, margin: 0, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, charSpacing: 2 });
    s.addText(title, { x: MX + 0.05, y: 0.38, w: 11.9, h: 0.52, margin: 0, valign: "middle", fontFace: HF, fontSize: 22, bold: true, color: WHITE });
  };
  // Bottom-LEFT — the baked turtle occupies the bottom-right corner.
  const pageNum = (s: pptxgen.Slide) => s.addText(String(PN), { x: MX, y: 7.08, w: 0.5, h: 0.3, margin: 0, align: "left", fontFace: BF, fontSize: 9, color: "9AB0BF" });
  const card = (s: pptxgen.Slide, x: number, y: number, w: number, h: number, fill?: string) => s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.09, fill: { color: fill || WHITE }, line: { color: fill && fill !== WHITE ? fill : LINE, width: 1 }, shadow: sh() });
  const dot = (s: pptxgen.Slide, x: number, y: number, dia: number, c: string, label: string) => { s.addShape(p.ShapeType.ellipse, { x, y, w: dia, h: dia, fill: { color: c } }); s.addText(label, { x, y, w: dia, h: dia, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: dia > 0.7 ? 15 : 12, bold: true, color: WHITE }); };
  const bullets = (s: pptxgen.Slide, items: string[], o: { x: number; y: number; w: number; h: number; size?: number; gap?: number; ls?: number; color?: string }) => {
    s.addText(items.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: o.color || INK, breakLine: i < items.length - 1, paraSpaceAfter: o.gap ?? 8 } })),
      { x: o.x, y: o.y, w: o.w, h: o.h, valign: "top", margin: 0, fontFace: BF, fontSize: o.size || 13, lineSpacingMultiple: o.ls || 1.03 });
  };
  const intro = (s: pptxgen.Slide, text: string) => s.addText(text, { x: MX, y: 1.28, w: 12.0, h: 0.5, margin: 0, fontFace: BF, fontSize: 14, italic: true, color: TEAL, lineSpacingMultiple: 1.05 });
  const content = (eyebrow: string, title: string, noLogo = false) => { PN++; const s = p.addSlide(); (noLogo ? bgNoLogo : bg)(s); pill(s, eyebrow, title); pageNum(s); return s; };

  /* 1 · TITLE */
  {
    const s = p.addSlide(); s.background = { color: WHITE };
    s.addImage({ data: HERO, x: 0, y: 0, w: W, h: 6.41 });
    s.addShape(p.ShapeType.rect, { x: 0, y: 6.38, w: W, h: H - 6.38, fill: { color: WHITE }, line: { type: "none" } });
    s.addText("COLLABORATIVE VALUE REVIEW", { x: MX, y: 2.7, w: 8.8, h: 0.4, margin: 0, fontFace: BF, fontSize: 15, bold: true, color: "EAF4FC", charSpacing: 2 });
    s.addText(d.customerName, { x: MX, y: 3.15, w: 8.6, h: 1.0, margin: 0, fontFace: HF, fontSize: 34, bold: true, color: WHITE });
    s.addText(`${d.presenter}${d.presenterTitle ? "   ·   " + d.presenterTitle : ""}`, { x: MX, y: 4.35, w: 8.6, h: 0.5, margin: 0, fontFace: BF, fontSize: 15, color: "EAF4FC" });
    s.addShape(p.ShapeType.roundRect, { x: 9.9, y: 3.2, w: 2.8, h: 1.3, rectRadius: 0.06, fill: { color: "FFFFFF" }, line: { color: "AFC9DF", width: 1, dashType: "dash" } });
    s.addText("[ CUSTOMER LOGO ]", { x: 9.9, y: 3.2, w: 2.8, h: 1.3, align: "center", valign: "middle", margin: 0, fontFace: BF, fontSize: 12, color: "8AA6BC" });
    s.addImage({ data: LOGO, x: W - 2.7, y: 6.62, w: 2.05, h: 0.85 });
    s.addNotes("Insert the customer logo per their trademark guidelines. Presenter defaults to the study owner.");
  }

  /* 2 · AGENDA */
  {
    const s = content("Agenda", "Collaborative Value Review");
    const items = [
      ["01", "Executive Summary", "Why do something, why now, and what's next"],
      ["02", "Case for Change", "The proof points behind the opportunity"],
      ["03", "Our Understanding", "Priorities, drivers, current & future state"],
      ["04", "Identifying Value & the Business Case", "Benefits, ROI, NPV and payback"],
      ["05", "Next Steps", "How we move forward together"],
    ];
    const y0 = 1.7, rh = 1.0;
    items.forEach((it, i) => {
      const y = y0 + i * rh;
      dot(s, MX, y, 0.7, [DEEP, BLUE, TEAL, GREEN, AMBER][i], it[0]);
      s.addText(it[1], { x: MX + 1.0, y: y - 0.02, w: 11.0, h: 0.4, margin: 0, fontFace: HF, fontSize: 18, bold: true, color: INK });
      s.addText(it[2], { x: MX + 1.0, y: y + 0.38, w: 11.0, h: 0.3, margin: 0, fontFace: BF, fontSize: 12.5, color: MUTED });
      if (i < items.length - 1) s.addShape(p.ShapeType.line, { x: MX + 1.0, y: y + 0.8, w: 11.3, h: 0, line: { color: "E6EEF5", width: 1 } });
    });
  }

  /* 3 · EXECUTIVE SUMMARY */
  {
    const s = content("Executive Summary", "The use case, in one view");
    const q = [
      ["Why do something?", or(d.whyDoSomething, "<The business problem / risk today, and why the status quo can't continue.>"), DEEP],
      ["Why now?", or(d.whyNow, "<The trigger — renewal, cost pressure, a compelling event — that makes this urgent.>"), BLUE],
      ["Why this solution?", or(d.whyThisSolution, "<Why the chosen solution and Blue Turtle's expertise are the right answer.>"), TEAL],
      ["What's next?", or(d.whatsNext, "<Joint sponsorship from business & IT leaders to realise the value.>"), GREEN],
    ];
    const cw = (CW - 0.5) / 2, ch = 1.62;
    q.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = MX + col * (cw + 0.5), y = 1.55 + row * (ch + 0.3);
      card(s, x, y, cw, ch, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: 0.13, h: ch, rectRadius: 0.06, fill: { color: c[2] }, line: { type: "none" } });
      s.addText(c[0], { x: x + 0.38, y: y + 0.2, w: cw - 0.7, h: 0.4, margin: 0, fontFace: HF, fontSize: 16, bold: true, color: c[2] });
      s.addText(clamp(c[1] as string, 210), { x: x + 0.38, y: y + 0.66, w: cw - 0.7, h: 0.86, valign: "top", margin: 0, fontFace: BF, fontSize: 11.5, color: INK, lineSpacingMultiple: 1.02 });
    });
    s.addText(or(d.useCaseLine, "USE CASES:  <Enterprise Use Case Title> · <Use case description>"), { x: MX, y: 5.5, w: 12.0, h: 0.5, margin: 0, fontFace: BF, fontSize: 12, italic: true, color: MUTED });
  }

  /* 4 · COLLABORATION */
  {
    const s = content("Our collaboration", "Who we spoke to — and what we did");
    intro(s, `${d.customerName} and Blue Turtle identified the need to evolve the platform to improve productivity and user experience.`);
    const stats = (d.collabStats?.length ? d.collabStats.map((c) => [c.value, c.label]) : [["XX", "Total hours"], ["XX", "Technical workshops"], ["XX", "Interviews"], ["XX", "Analysis & documentation"]]) as string[][];
    const sw = (CW - 3 * 0.3) / 4;
    stats.forEach((st, i) => {
      const x = MX + i * (sw + 0.3), y = 1.95;
      card(s, x, y, sw, 1.0, MIST);
      s.addText(st[0], { x, y: y + 0.12, w: sw, h: 0.5, align: "center", margin: 0, fontFace: HF, fontSize: 24, bold: true, color: DEEP });
      s.addText(st[1], { x: x + 0.1, y: y + 0.64, w: sw - 0.2, h: 0.3, align: "center", margin: 0, fontFace: BF, fontSize: 11, color: MUTED });
    });
    const cw = (CW - 0.5) / 2;
    const parts = d.participants.length ? d.participants.map((pp) => `${pp.name}${pp.title ? " — " + pp.title : ""}`) : ["<name> — <title>", "<name> — <title>", "<name> — <title>"];
    const deliveryTeam = d.deliveryTeam?.length ? d.deliveryTeam : ["<name> — <title>", "<name> — <title>", "<name> — <title>"];
    [["Delivery team", DEEP, deliveryTeam], [`${d.customerName} participants`, TEAL, parts]].forEach((col, i) => {
      const x = MX + i * (cw + 0.5), y = 3.2;
      card(s, x, y, cw, 3.1, WHITE);
      s.addText(col[0] as string, { x: x + 0.3, y: y + 0.18, w: cw - 0.6, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: col[1] as string });
      bullets(s, (col[2] as string[]).slice(0, 6), { x: x + 0.35, y: y + 0.65, w: cw - 0.7, h: 2.3, size: 12, gap: 7, color: INK });
    });
    s.addNotes(
      "THE NUMBERS ON THIS SLIDE (the four stat tiles) are engagement EFFORT, not calculations — they are captured in the study (value-story 'collaboration stats'), not computed by the app. Typically: total hours, technical workshops, interviews, and analysis/documentation days.\n\n" +
      "What they mean: they evidence the depth of the joint discovery behind everything that follows — the more time invested together, the more defensible the baseline and the business case. Frame them as 'here is how much work we did jointly to reach these conclusions.'\n\n" +
      "If a tile still reads 'XX', that figure has not been captured in the study yet. The two lists below are the people who took part (Blue Turtle delivery team and the customer participants), drawn from the engagement stakeholders."
    );
  }

  /* 5 · CASE FOR CHANGE */
  {
    const s = content("Case for Change", "The proof points behind the opportunity");
    const pp = d.proofPoints.length ? d.proofPoints.slice(0, 4) : [
      { value: "XX", label: "<Add Heading>", description: "<Short description>" }, { value: "XX", label: "<Add Heading>", description: "<Short description>" },
      { value: "XX", label: "<Add Heading>", description: "<Short description>" }, { value: "XX", label: "<Add Heading>", description: "<Short description>" },
    ];
    const colc = [DEEP, BLUE, TEAL, AMBER];
    const cw = (CW - 3 * 0.4) / 4;
    pp.forEach((c, i) => {
      const x = MX + i * (cw + 0.4), y = 1.9;
      card(s, x, y, cw, 3.4, WHITE);
      s.addText(c.value, { x: x + 0.2, y: y + 0.35, w: cw - 0.4, h: 0.9, align: "center", margin: 0, fontFace: HF, fontSize: c.value.length > 6 ? 24 : 38, bold: true, color: colc[i] });
      s.addText(c.label, { x: x + 0.25, y: y + 1.5, w: cw - 0.5, h: 0.5, align: "center", margin: 0, fontFace: HF, fontSize: 14, bold: true, color: INK });
      s.addText(c.description || "", { x: x + 0.25, y: y + 2.05, w: cw - 0.5, h: 1.1, align: "center", margin: 0, fontFace: BF, fontSize: 11, color: MUTED, lineSpacingMultiple: 1.03 });
    });
    s.addText("*Source — as captured in the study baseline (with source & period).", { x: MX, y: 5.6, w: 12.0, h: 0.3, margin: 0, fontFace: BF, fontSize: 10.5, italic: true, color: MUTED });
    s.addNotes(
      "THE BIG FIGURES ON THIS SLIDE are current-state PROOF POINTS — measured baseline numbers captured during discovery, not estimates or projections. In the app they come from the study baseline items (the cost / performance / constraint metrics).\n\n" +
      "For each card: the large figure is the headline metric (e.g. 68.8% utilisation, a rand cost, a volume or a count), the heading is what it measures, and the small caption is its SOURCE. Each should trace to a source and a measurement period (see the footnote).\n\n" +
      "What they mean: together they quantify the size of today's problem — the evidence for 'why change'. The business case later shows the value of closing these gaps. Be ready to cite the source and the window for every figure; an 'XX' means the baseline item is not captured yet."
    );
  }

  /* 6 · PRIORITIES */
  {
    const s = content("Our Understanding", `Our understanding of ${d.customerName}'s priorities`);
    const cols = orList(d.priorities?.map((c) => c.join("\n")), ["<Priority detail>\n<Priority detail>\n<Priority detail>", "<Priority detail>\n<Priority detail>\n<Priority detail>", "<Priority detail>\n<Priority detail>\n<Priority detail>"], 3);
    const cw = (CW - 2 * 0.4) / 3;
    for (let i = 0; i < 3; i++) {
      const x = MX + i * (cw + 0.4), y = 1.55;
      card(s, x, y, cw, 3.3, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: cw, h: 0.5, rectRadius: 0.09, fill: { color: [DEEP, BLUE, TEAL][i] }, line: { type: "none" } });
      s.addText("PRIORITY " + (i + 1), { x, y, w: cw, h: 0.5, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 12.5, bold: true, color: WHITE, charSpacing: 1 });
      bullets(s, (cols[i] || "").split("\n").filter(Boolean), { x: x + 0.3, y: y + 0.7, w: cw - 0.6, h: 2.4, size: 12.5, gap: 10, color: INK });
    }
    s.addShape(p.ShapeType.roundRect, { x: MX, y: 5.1, w: CW, h: 1.25, rectRadius: 0.09, fill: { color: MIST }, line: { type: "none" } });
    s.addText(or(d.priorityQuote, "“<Customer quote that captures their priority / ambition.>”"), { x: MX + 0.35, y: 5.25, w: CW - 0.7, h: 0.6, margin: 0, fontFace: HF, fontSize: 14, italic: true, color: DEEP });
    s.addText(d.priorityQuoteBy ? `— ${d.priorityQuoteBy}` : "— <Add name here>", { x: MX + 0.35, y: 5.85, w: CW - 0.7, h: 0.35, margin: 0, fontFace: BF, fontSize: 12, color: MUTED });
  }

  /* 7 · INITIATIVES */
  {
    const s = content("Our Understanding", "Key business-aligned technology initiatives");
    const init = d.initiatives.length ? d.initiatives.slice(0, 3) : [{ title: "Initiative 1" }, { title: "Initiative 2" }, { title: "Initiative 3" }];
    const cw = (CW - 2 * 0.4) / 3;
    for (let i = 0; i < 3; i++) {
      const it = init[i] || { title: `Initiative ${i + 1}` };
      const x = MX + i * (cw + 0.4), y = 1.6;
      card(s, x, y, cw, 4.4, WHITE);
      dot(s, x + 0.3, y + 0.3, 0.6, [DEEP, BLUE, TEAL][i], String(i + 1));
      s.addText(it.title, { x: x + 1.05, y: y + 0.38, w: cw - 1.2, h: 0.7, valign: "middle", margin: 0, fontFace: HF, fontSize: 15, bold: true, color: INK });
      s.addText("Details", { x: x + 0.3, y: y + 1.25, w: cw - 0.6, h: 0.3, margin: 0, fontFace: HF, fontSize: 12, bold: true, color: [DEEP, BLUE, TEAL][i] });
      s.addText(or(it.detail, "<Description of the initiative and how the platform enables it.>"), { x: x + 0.3, y: y + 1.55, w: cw - 0.6, h: 1.25, margin: 0, fontFace: BF, fontSize: 12, color: INK, lineSpacingMultiple: 1.05 });
      s.addText("Quote / reference", { x: x + 0.3, y: y + 2.9, w: cw - 0.6, h: 0.3, margin: 0, fontFace: HF, fontSize: 12, bold: true, color: [DEEP, BLUE, TEAL][i] });
      s.addText(or(it.quote, "“<Supporting quote or reference.>”"), { x: x + 0.3, y: y + 3.2, w: cw - 0.6, h: 1.0, margin: 0, fontFace: BF, fontSize: 11.5, italic: true, color: MUTED, lineSpacingMultiple: 1.05 });
    }
  }

  /* 8 · DRIVERS & ENABLERS */
  {
    const s = content("Our Understanding", "Business drivers & enablers", true); // full-width table reaches the corner → no-logo canvas
    const de = d.driversEnablers.length ? d.driversEnablers.slice(0, 4) : Array.from({ length: 4 }, () => ({ driver: "<Business driver>\n<short description>", enabler: "<Digital use case / enabler>\n<short description>" }));
    const head = ["Business Driver", "Digital Use Case / Enabler"];
    const rows: pptxgen.TableRow[] = [head.map((t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: 13, valign: "middle" } }))];
    de.forEach((r, i) => {
      const band = i % 2 ? "F4F9FD" : WHITE;
      rows.push([
        { text: r.driver, options: { color: INK, fill: { color: band }, fontSize: 12, valign: "middle" } },
        { text: r.enabler, options: { color: INK, fill: { color: band }, fontSize: 12, valign: "middle" } },
      ]);
    });
    s.addTable(rows, { x: MX, y: 1.6, w: CW, colW: [6.06, 6.07], rowH: 1.05, border: { type: "solid", color: "E6EEF5", pt: 1 }, align: "left", valign: "middle", fontFace: BF, autoPage: false, margin: [4, 8, 4, 8] });
  }

  /* 9 · IDENTIFYING VALUE */
  {
    const s = content("Identifying Value", "Use cases → benefit groups → benefits");
    const br = d.benefitRows.length ? d.benefitRows.slice(0, 5) : [
      { useCase: "<Use case 1>", group: "Productivity / Process", benefits: "<Benefit>  ·  <Benefit>" },
      { useCase: "<Use case 2>", group: "Customer Experience", benefits: "<Benefit>  ·  <Benefit>" },
      { useCase: "<Use case 3>", group: "Risk Reduction", benefits: "<Benefit>  ·  <Benefit>" },
      { useCase: "<Use case 4>", group: "Cost Saving", benefits: "<Benefit>  ·  <Benefit>" },
    ];
    const head = ["Use case", "Benefit group", "Benefits"];
    const rows: pptxgen.TableRow[] = [head.map((t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: 12.5, valign: "middle" } }))];
    br.forEach((r, i) => {
      const band = i % 2 ? "F4F9FD" : WHITE;
      rows.push([
        { text: r.useCase, options: { bold: true, color: INK, fill: { color: band }, fontSize: 11.5, valign: "middle" } },
        { text: r.group, options: { color: INK, fill: { color: band }, fontSize: 11.5, valign: "middle" } },
        { text: r.benefits, options: { color: INK, fill: { color: band }, fontSize: 11.5, valign: "middle" } },
      ]);
    });
    s.addTable(rows, { x: MX, y: 1.6, w: CW, colW: [2.7, 2.9, 6.53], rowH: 0.85, border: { type: "solid", color: "E6EEF5", pt: 1 }, align: "left", valign: "middle", fontFace: BF, autoPage: false, margin: [4, 8, 4, 8] });
  }

  /* 10 · CURRENT / IMPLICATIONS */
  {
    const s = content("Our Understanding", "Current state & implications");
    const cw = (CW - 0.5) / 2;
    const data: [string, string, string[]][] = [
      ["Current State", DEEP, orList(d.currentState, ["<Current-state observation>", "<Current-state observation>", "<Current-state observation>"], 6)],
      ["Implications", AMBER, orList(d.implications, ["<Business implication / risk>", "<Business implication / risk>", "<Business implication / risk>"], 6)],
    ];
    data.forEach((c, i) => {
      const x = MX + i * (cw + 0.5), y = 1.55;
      card(s, x, y, cw, 4.6, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: cw, h: 0.5, rectRadius: 0.09, fill: { color: c[1] }, line: { type: "none" } });
      s.addText(c[0], { x, y, w: cw, h: 0.5, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 15, bold: true, color: WHITE });
      bullets(s, c[2], { x: x + 0.35, y: y + 0.75, w: cw - 0.7, h: 3.6, size: 12.5, gap: 10, color: INK });
    });
  }

  /* 11 · FUTURE / KEY BENEFITS */
  {
    const s = content("Our Understanding", "Future state & key benefits");
    const cw = (CW - 0.5) / 2;
    const data: [string, string, string[]][] = [
      ["Future State", TEAL, orList(d.futureState, ["<Future-state capability>", "<Future-state capability>", "<Future-state capability>"], 6)],
      ["Key Benefits", GREEN, orList(d.keyBenefits, ["<Key benefit>", "<Key benefit>", "<Key benefit>"], 6)],
    ];
    data.forEach((c, i) => {
      const x = MX + i * (cw + 0.5), y = 1.55;
      card(s, x, y, cw, 4.6, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: cw, h: 0.5, rectRadius: 0.09, fill: { color: c[1] }, line: { type: "none" } });
      s.addText(c[0], { x, y, w: cw, h: 0.5, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 15, bold: true, color: WHITE });
      bullets(s, c[2], { x: x + 0.35, y: y + 0.75, w: cw - 0.7, h: 3.6, size: 12.5, gap: 10, color: INK });
    });
  }

  /* 12 · PER-USE-CASE (one per shortlisted recommendation) */
  {
    const ucs = d.useCases.length ? d.useCases : [{ title: "<Use case>" }];
    ucs.forEach((uc) => {
      const s = content("Our Understanding · " + uc.title, "Current · Implications · Future · Benefits");
      const cw = (CW - 0.5) / 2, ch = 2.35;
      const quad: [string, string, string][] = [
        ["Current State", DEEP, or(uc.current, "<to be added>")],
        ["Implications", AMBER, or(uc.implications, "<to be added>")],
        ["Future State", TEAL, or(uc.future, "<to be added>")],
        ["Key Benefits", GREEN, or(uc.benefits, "<to be added>")],
      ];
      quad.forEach((c, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = MX + col * (cw + 0.5), y = 1.5 + row * (ch + 0.25);
        card(s, x, y, cw, ch, WHITE);
        s.addText(c[0].toUpperCase(), { x: x + 0.3, y: y + 0.18, w: cw - 0.6, h: 0.3, margin: 0, fontFace: HF, fontSize: 12.5, bold: true, color: c[1], charSpacing: 1 });
        s.addText(c[2], { x: x + 0.3, y: y + 0.55, w: cw - 0.6, h: 1.6, margin: 0, fontFace: BF, fontSize: 12, color: INK, lineSpacingMultiple: 1.08 });
      });
    });
  }

  /* 13 · THREE-YEAR SUMMARY */
  {
    const s = content("The Business Case", "Summary of results");
    const stats: [string, string, string][] = [["PAYBACK", or(d.paybackMonths, "X months"), GREEN], ["ROI", or(d.roiPct, "X%"), DEEP], ["NPV", or(d.npv, "—"), TEAL]];
    const cw = (CW - 2 * 0.5) / 3;
    stats.forEach((st, i) => {
      const x = MX + i * (cw + 0.5), y = 2.1;
      card(s, x, y, cw, 2.6, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: cw, h: 0.6, rectRadius: 0.09, fill: { color: st[2] }, line: { type: "none" } });
      s.addText(st[0], { x, y, w: cw, h: 0.6, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 15, bold: true, color: WHITE, charSpacing: 1 });
      s.addText(st[1], { x: x + 0.2, y: y + 1.1, w: cw - 0.4, h: 0.9, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 26, bold: true, color: INK });
    });
    s.addText(d.realized ? "Realised value, from the linked Value Realisation track." : "Planned value at VE stage; becomes realised value through Value Realisation (VR).", { x: MX, y: 5.1, w: 12.0, h: 0.4, margin: 0, fontFace: BF, fontSize: 12.5, italic: true, color: MUTED });
    s.addNotes(
      "THREE HEADLINE RESULTS from the finance engine, all derived from the business-case cash-flow lines over the chosen horizon (default 5 years). Building blocks: up-front INVESTMENT = capex + one-off costs in year 0; ANNUAL NET BENEFIT = recurring benefit inflows minus recurring opex.\n\n" +
      "• PAYBACK (months) = investment ÷ annual net benefit × 12 — how long until accumulated benefit repays the up-front spend. Shorter is better.\n" +
      "• ROI % = (annual net benefit × horizon − investment) ÷ investment × 100 — the net return across the whole horizon as a percentage of what was invested.\n" +
      "• NPV = each year's net cash flow discounted back to today and summed (year 0 = −investment), using the discount rate (default 10%). A positive NPV means the benefits beat the costs in today's money.\n\n" +
      "These are PLANNED values at VE stage; they become REALISED as the VR track delivers (the footnote states which you are showing). The next slide shows the full year-by-year cash flow these three figures come from."
    );
  }

  /* 14 · FINANCIAL DETAIL — cash-flow table (years as rows) + payback curve */
  {
    const cf = d.cashflow;
    const years = cf?.years ?? d.finYears;
    const s = content("The Business Case", `Cash flow & the payback curve (${years.length - 1}-year horizon)`);
    const cur = d.currency;
    const money = (v: number, signed = false) => { if (Math.abs(v) < 1) return "—"; const t = fmtMoneyShort(v, cur); return signed && v > 0 ? "+" + t : t; };

    // ---- Left: years-as-rows cash-flow statement ----------------------------
    const ben = cf?.benefit ?? [], cost = cf?.cost ?? [], net = cf?.net ?? [], cumNet = cf?.cumNet ?? [];
    const nR = years.length;
    const TW = 6.5, colW = [1.15, 1.3, 1.3, 1.25, 1.5]; // Period · Benefit · Cost · Net · Cum net
    const rowH = Math.min(0.58, 4.75 / (nR + 2));
    const fs = nR > 7 ? 9 : 10.5;
    const NEG_BG = "FBE9E9", NEG_TX = "B3261E", POS_BG = "E7F4EC", POS_TX = "1E7A46";
    const head = ["Period", "Benefit in", "Cost out", "Net", "Cumulative net"];
    const rows: pptxgen.TableRow[] = [head.map((t, i) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: nR > 7 ? 9 : 10, valign: "middle", align: i === 0 ? "left" : "right" } }))];
    years.forEach((yl, i) => {
      const band = i % 2 ? "F4F9FD" : WHITE;
      const nv = net[i] ?? 0, cn = cumNet[i] ?? 0, cnPos = cn >= 0;
      rows.push([
        { text: yl, options: { color: INK, fill: { color: band }, fontSize: fs, valign: "middle", align: "left" } },
        { text: money(ben[i] ?? 0), options: { color: MUTED, fill: { color: band }, fontSize: fs, valign: "middle", align: "right" } },
        { text: money(cost[i] ?? 0), options: { color: MUTED, fill: { color: band }, fontSize: fs, valign: "middle", align: "right" } },
        { text: money(nv, true), options: { color: nv < 0 ? NEG_TX : POS_TX, fill: { color: band }, fontSize: fs, valign: "middle", align: "right" } },
        { text: money(cn, true) + (cnPos ? "  ▲" : "  ▼"), options: { bold: true, color: cnPos ? POS_TX : NEG_TX, fill: { color: cnPos ? POS_BG : NEG_BG }, fontSize: fs, valign: "middle", align: "right" } },
      ]);
    });
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    rows.push([
      { text: "Total", options: { bold: true, color: INK, fill: { color: "E7EEF7" }, fontSize: fs, valign: "middle", align: "left" } },
      { text: money(sum(ben)), options: { bold: true, color: INK, fill: { color: "E7EEF7" }, fontSize: fs, valign: "middle", align: "right" } },
      { text: money(sum(cost)), options: { bold: true, color: INK, fill: { color: "E7EEF7" }, fontSize: fs, valign: "middle", align: "right" } },
      { text: money(sum(net), true), options: { bold: true, color: INK, fill: { color: "E7EEF7" }, fontSize: fs, valign: "middle", align: "right" } },
      { text: "—", options: { color: MUTED, fill: { color: "E7EEF7" }, fontSize: fs, valign: "middle", align: "right" } },
    ]);
    s.addTable(rows, { x: MX, y: 1.55, w: TW, colW, rowH, border: { type: "solid", color: "E6EEF5", pt: 1 }, fontFace: BF, autoPage: false, margin: [2, 5, 2, 5] });

    // ---- Right-top: RESULTS -------------------------------------------------
    const RX = 7.5, RW = W - MX - RX;
    card(s, RX, 1.55, RW, 1.9, MIST);
    s.addText("RESULTS", { x: RX + 0.25, y: 1.68, w: RW - 0.5, h: 0.3, margin: 0, fontFace: HF, fontSize: 12, bold: true, color: DEEP, charSpacing: 1 });
    d.results.slice(0, 4).forEach((r, i) => {
      const y = 2.02 + i * 0.35;
      s.addText(r.label, { x: RX + 0.25, y, w: RW - 1.75, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, color: INK });
      s.addText(r.value, { x: RX + RW - 1.75, y, w: 1.5, h: 0.3, align: "right", margin: 0, fontFace: HF, fontSize: 11.5, bold: true, color: DEEP });
    });

    // ---- Right-bottom: payback curve (single cumulative-net line) -----------
    const CY = 3.6, CH = 2.6;
    s.addShape(p.ShapeType.roundRect, { x: RX, y: CY, w: RW, h: CH, rectRadius: 0.09, fill: { color: WHITE }, line: { color: LINE, width: 1 } });
    s.addText("PAYBACK CURVE — CUMULATIVE NET POSITION", { x: RX + 0.2, y: CY + 0.1, w: RW - 0.4, h: 0.24, margin: 0, fontFace: HF, fontSize: 9, bold: true, color: MUTED, charSpacing: 1 });
    if (cf && (cumNet.some((v) => v) || net.some((v) => v))) {
      const lo = Math.min(...cumNet, 0), hi = Math.max(...cumNet, 0);
      const niceStep = (x: number) => { const pw = Math.pow(10, Math.floor(Math.log10(x || 1))); const f = (x || 1) / pw; const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10; return n * pw; };
      const unit = niceStep((hi - lo) / 4 || 1);
      const minV = Math.floor(lo / unit) * unit, maxV = Math.ceil(hi / unit) * unit;
      const maxAbs = Math.max(Math.abs(minV), Math.abs(maxV));
      const fmtCode = maxAbs >= 1e6 ? '#,##0,,"M";-#,##0,,"M"' : maxAbs >= 1e3 ? '#,##0,"k";-#,##0,"k"' : "#,##0";
      s.addChart(p.ChartType.line, [{ name: "Cumulative net", labels: years, values: cumNet }], {
        x: RX + 0.12, y: CY + 0.34, w: RW - 0.24, h: CH - 0.92, chartColors: [BLUE], showLegend: false, showTitle: false,
        lineSize: 2.5, lineSmooth: true, showValue: false,
        catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, valAxisLabelFormatCode: fmtCode,
        valAxisMinVal: minV, valAxisMaxVal: maxV, valAxisMajorUnit: unit,
        valGridLine: { style: "solid", size: 1, color: "E6EEF5" }, catGridLine: { style: "none" },
      });
      const beIdx = cumNet.findIndex((v) => v >= 0);
      const beLabel = (d.paybackMonths && d.paybackMonths !== "—") ? d.paybackMonths : (beIdx > 0 ? years[beIdx] : "—");
      const finalNet = cumNet.length ? money(cumNet[cumNet.length - 1], true) : "—";
      s.addText([
        { text: "● ", options: { color: GREEN } }, { text: `Break-even: ${beLabel}`, options: { color: INK } },
        { text: "      ● ", options: { color: BLUE } }, { text: `Net by ${years[years.length - 1]}: ${finalNet}`, options: { color: INK, bold: true } },
      ], { x: RX + 0.2, y: CY + CH - 0.52, w: RW - 0.4, h: 0.22, margin: 0, fontFace: BF, fontSize: 9.5, valign: "middle" });
      s.addText("Below 0 = still paying back  ·  above 0 = in profit", { x: RX + 0.2, y: CY + CH - 0.3, w: RW - 0.4, h: 0.2, margin: 0, fontFace: BF, fontSize: 8.5, italic: true, color: MUTED });
    } else {
      s.addText("[ Payback curve ]", { x: RX, y: CY + 0.5, w: RW, h: 1.4, align: "center", valign: "middle", margin: 0, fontFace: BF, fontSize: 11, italic: true, color: "8AA6BC" });
    }

    s.addText(d.realized ? "Figures in compact units; realised value from the linked Value Realisation track." : "Figures in compact units; planned value at VE stage — becomes realised through Value Realisation (VR).", { x: MX, y: 6.52, w: 12.0, h: 0.35, margin: 0, fontFace: BF, fontSize: 11, italic: true, color: MUTED });

    s.addNotes(
      "THE CASH-FLOW TABLE (left) reads down the years — 'Now' (year 0, the up-front investment) then each year of the horizon, with a Total row.\n" +
      "Columns: Benefit in = benefit inflows that year; Cost out = all costs that year (up-front capex & one-off land in 'Now', recurring opex thereafter); Net = benefit − cost; Cumulative net = the running total of Net.\n" +
      "The Cumulative net column is shaded RED while negative (still paying back) and GREEN once positive (in profit) — the row where it turns green is the payback point.\n\n" +
      "Figures are shown in compact units (e.g. R2.4M = R2 400 000) to keep the grid readable. Two reconciliation rows are kept here in the notes rather than on the slide: CUMULATIVE BENEFIT = the running total of Benefit in; DISCOUNTED CASH FLOW = each year's Net discounted to today at the discount rate — that discounted series SUMS to the NPV shown in the RESULTS box.\n\n" +
      "THE PAYBACK CURVE (right) plots the Cumulative net column as a single line:\n" +
      "• It starts below zero at minus the up-front investment, climbs as net benefit accrues, and crosses the zero line at the PAYBACK POINT (the green marker / the payback months in RESULTS).\n" +
      "• Below the zero line = still recovering the investment; above = net gain. The line's height at the final year is the net lifetime gain — the basis of the positive NPV and ROI.\n" +
      "• The value axis is in compact units (M = millions, k = thousands) of the study currency.\n\n" +
      "Talking point: 'costs land early, benefits compound — here's the month we're paid back, and here's the net gain by year " + (years.length - 1) + ".'"
    );
  }

  /* 15 · NEXT STEPS */
  {
    const s = content("Next Steps", "How we move forward together");
    intro(s, `These results are achieved through joint sponsorship from ${d.customerName} business & IT leaders, coupled with the right solution and Blue Turtle's expertise.`);
    const ns = d.nextSteps.length ? d.nextSteps.slice(0, 4) : [
      { area: "Operational Excellence", detail: "Complete the collaborative opportunity assessment · executive sponsorship to authorise & define investment goals" },
      { area: "Technology Partnership", detail: "Jointly prioritise the top opportunities · plan with sponsors to develop a full implementation plan" },
      { area: "Utility of Future Vision", detail: "Refine scope, deliverables & timeline · confirm priority goals that need joint development" },
      { area: "Overall Relationship", detail: "Align executive sponsors for the partnership · confirm governance process & joint objectives" },
    ];
    const colc = [DEEP, BLUE, TEAL, GREEN];
    const cw = (CW - 0.5) / 2, ch = 1.75;
    ns.forEach((a, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = MX + col * (cw + 0.5), y = 2.05 + row * (ch + 0.3);
      card(s, x, y, cw, ch, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: 0.13, h: ch, rectRadius: 0.06, fill: { color: colc[i] }, line: { type: "none" } });
      s.addText(a.area, { x: x + 0.38, y: y + 0.2, w: cw - 0.7, h: 0.4, margin: 0, fontFace: HF, fontSize: 15, bold: true, color: colc[i] });
      s.addText(a.detail, { x: x + 0.38, y: y + 0.66, w: cw - 0.7, h: 1.0, margin: 0, fontFace: BF, fontSize: 12, color: INK, lineSpacingMultiple: 1.08 });
    });
  }

  const out = (await p.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
