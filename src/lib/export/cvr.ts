// =============================================================================
//  Collaborative Value Review (CVR) — PowerPoint builder.
//  Vendor-neutral, Blue Turtle brand. Fills the 15 VE-producible slides from a
//  completed VE study; missing fields fall back to <placeholder> text so the
//  deck is always complete and fillable.
// =============================================================================
import pptxgen from "pptxgenjs";
import { BG_CONTENT, BG_DARK, LOGO, HERO } from "./cvr-assets";

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
export interface CvrFinRow { label: string; y1?: string; y2?: string; y3?: string; total?: string; emph?: boolean }
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
  proofPoints: CvrProofPoint[];
  priorities: string[][];      // up to 3 columns of bullets
  priorityQuote?: string;
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
  results: { label: string; value: string }[];
  nextSteps: CvrNextStep[];
}

const or = (v: string | undefined | null, ph: string) => (v && v.trim() ? v.trim() : ph);
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
  const bg = (s: pptxgen.Slide) => s.addImage({ data: BG_CONTENT, x: 0, y: 0, w: W, h: H });
  const pill = (s: pptxgen.Slide, eyebrow: string, title: string) => {
    s.addText(eyebrow.toUpperCase(), { x: MX + 0.05, y: 0.16, w: 11.2, h: 0.28, margin: 0, fontFace: BF, fontSize: 12, bold: true, color: "DBF0FF", charSpacing: 2 });
    s.addText(title, { x: MX + 0.05, y: 0.44, w: 11.9, h: 0.72, margin: 0, valign: "middle", fontFace: HF, fontSize: 23, bold: true, color: WHITE });
  };
  const pageNum = (s: pptxgen.Slide) => s.addText(String(PN), { x: W - 0.9, y: 7.05, w: 0.5, h: 0.3, margin: 0, align: "right", fontFace: BF, fontSize: 9, color: "9AB0BF" });
  const card = (s: pptxgen.Slide, x: number, y: number, w: number, h: number, fill?: string) => s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.09, fill: { color: fill || WHITE }, line: { color: fill && fill !== WHITE ? fill : LINE, width: 1 }, shadow: sh() });
  const dot = (s: pptxgen.Slide, x: number, y: number, dia: number, c: string, label: string) => { s.addShape(p.ShapeType.ellipse, { x, y, w: dia, h: dia, fill: { color: c } }); s.addText(label, { x, y, w: dia, h: dia, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: dia > 0.7 ? 15 : 12, bold: true, color: WHITE }); };
  const bullets = (s: pptxgen.Slide, items: string[], o: { x: number; y: number; w: number; h: number; size?: number; gap?: number; ls?: number; color?: string }) => {
    s.addText(items.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: o.color || INK, breakLine: i < items.length - 1, paraSpaceAfter: o.gap ?? 8 } })),
      { x: o.x, y: o.y, w: o.w, h: o.h, valign: "top", margin: 0, fontFace: BF, fontSize: o.size || 13, lineSpacingMultiple: o.ls || 1.03 });
  };
  const intro = (s: pptxgen.Slide, text: string) => s.addText(text, { x: MX, y: 1.28, w: 12.0, h: 0.5, margin: 0, fontFace: BF, fontSize: 14, italic: true, color: TEAL, lineSpacingMultiple: 1.05 });
  const content = (eyebrow: string, title: string) => { PN++; const s = p.addSlide(); bg(s); pill(s, eyebrow, title); pageNum(s); return s; };

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
      s.addText(c[1], { x: x + 0.38, y: y + 0.66, w: cw - 0.7, h: 0.85, margin: 0, fontFace: BF, fontSize: 12.5, color: INK, lineSpacingMultiple: 1.05 });
    });
    s.addText(or(d.useCaseLine, "USE CASES:  <Enterprise Use Case Title> · <Use case description>"), { x: MX, y: 5.5, w: 12.0, h: 0.5, margin: 0, fontFace: BF, fontSize: 12, italic: true, color: MUTED });
  }

  /* 4 · COLLABORATION */
  {
    const s = content("Our collaboration", "Who we spoke to — and what we did");
    intro(s, `${d.customerName} and Blue Turtle identified the need to evolve the platform to improve productivity and user experience.`);
    const stats = [["XX", "Total hours"], ["XX", "Technical workshops"], ["XX", "Interviews"], ["XX", "Analysis & documentation"]];
    const sw = (CW - 3 * 0.3) / 4;
    stats.forEach((st, i) => {
      const x = MX + i * (sw + 0.3), y = 1.95;
      card(s, x, y, sw, 1.0, MIST);
      s.addText(st[0], { x, y: y + 0.12, w: sw, h: 0.5, align: "center", margin: 0, fontFace: HF, fontSize: 24, bold: true, color: DEEP });
      s.addText(st[1], { x: x + 0.1, y: y + 0.64, w: sw - 0.2, h: 0.3, align: "center", margin: 0, fontFace: BF, fontSize: 11, color: MUTED });
    });
    const cw = (CW - 0.5) / 2;
    const parts = d.participants.length ? d.participants.map((pp) => `${pp.name}${pp.title ? " — " + pp.title : ""}`) : ["<name> — <title>", "<name> — <title>", "<name> — <title>"];
    [["Delivery team", DEEP, ["<name> — <title>", "<name> — <title>", "<name> — <title>"]], [`${d.customerName} participants`, TEAL, parts]].forEach((col, i) => {
      const x = MX + i * (cw + 0.5), y = 3.2;
      card(s, x, y, cw, 3.1, WHITE);
      s.addText(col[0] as string, { x: x + 0.3, y: y + 0.18, w: cw - 0.6, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: col[1] as string });
      bullets(s, (col[2] as string[]).slice(0, 6), { x: x + 0.35, y: y + 0.65, w: cw - 0.7, h: 2.3, size: 12, gap: 7, color: INK });
    });
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
    s.addText("— <Add name here>", { x: MX + 0.35, y: 5.85, w: CW - 0.7, h: 0.35, margin: 0, fontFace: BF, fontSize: 12, color: MUTED });
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
    const s = content("Our Understanding", "Business drivers & enablers");
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
    const s = content("The Business Case", "Three-year summary of results");
    const stats: [string, string, string][] = [["PAYBACK", or(d.paybackMonths, "X months"), GREEN], ["ROI", or(d.roiPct, "X%"), DEEP], ["NPV", or(d.npv, "—"), TEAL]];
    const cw = (CW - 2 * 0.5) / 3;
    stats.forEach((st, i) => {
      const x = MX + i * (cw + 0.5), y = 2.1;
      card(s, x, y, cw, 2.6, WHITE);
      s.addShape(p.ShapeType.roundRect, { x, y, w: cw, h: 0.6, rectRadius: 0.09, fill: { color: st[2] }, line: { type: "none" } });
      s.addText(st[0], { x, y, w: cw, h: 0.6, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 15, bold: true, color: WHITE, charSpacing: 1 });
      s.addText(st[1], { x: x + 0.2, y: y + 1.1, w: cw - 0.4, h: 0.9, align: "center", valign: "middle", margin: 0, fontFace: HF, fontSize: 26, bold: true, color: INK });
    });
    s.addText(d.realized ? "Realised value, from the linked Value Realization track." : "Planned value at VE stage; becomes realised value through Value Realization (VR).", { x: MX, y: 5.1, w: 12.0, h: 0.4, margin: 0, fontFace: BF, fontSize: 12.5, italic: true, color: MUTED });
  }

  /* 14 · FINANCIAL DETAIL */
  {
    const s = content("The Business Case", "Three-year financial detail");
    const head = ["Benefit / Investment", "Year 1", "Year 2", "Year 3", "Total"];
    const rows: pptxgen.TableRow[] = [head.map((t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: 11, valign: "middle", align: t === "Benefit / Investment" ? "left" : "right" } }))];
    d.financialRows.forEach((r, i) => {
      const band = r.emph ? "E7EEF7" : (i % 2 ? "F4F9FD" : WHITE);
      rows.push([
        { text: r.label, options: { bold: !!r.emph, color: INK, fill: { color: band }, fontSize: 10.5, valign: "middle", align: "left" } },
        ...[r.y1, r.y2, r.y3, r.total].map((v) => ({ text: v ?? "—", options: { color: MUTED, fill: { color: band }, fontSize: 10.5, valign: "middle" as const, align: "right" as const } })),
      ]);
    });
    s.addTable(rows, { x: MX, y: 1.55, w: 8.3, colW: [3.5, 1.2, 1.2, 1.2, 1.2], rowH: 0.34, border: { type: "solid", color: "E6EEF5", pt: 1 }, fontFace: BF, autoPage: false, margin: [2, 5, 2, 5] });
    card(s, 9.15, 1.55, 3.58, 2.35, MIST);
    s.addText("RESULTS", { x: 9.4, y: 1.7, w: 3.1, h: 0.3, margin: 0, fontFace: HF, fontSize: 12, bold: true, color: DEEP, charSpacing: 1 });
    d.results.slice(0, 4).forEach((r, i) => {
      const y = 2.05 + i * 0.42;
      s.addText(r.label, { x: 9.4, y, w: 2.1, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, color: INK });
      s.addText(r.value, { x: 11.4, y, w: 1.2, h: 0.3, align: "right", margin: 0, fontFace: HF, fontSize: 11, bold: true, color: DEEP });
    });
    s.addShape(p.ShapeType.roundRect, { x: 9.15, y: 4.1, w: 3.58, h: 2.05, rectRadius: 0.09, fill: { color: WHITE }, line: { color: LINE, width: 1 } });
    s.addText("[ Cash-flow chart:\ncumulative savings vs investment ]", { x: 9.15, y: 4.1, w: 3.58, h: 2.05, align: "center", valign: "middle", margin: 0, fontFace: BF, fontSize: 11, italic: true, color: "8AA6BC" });
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
