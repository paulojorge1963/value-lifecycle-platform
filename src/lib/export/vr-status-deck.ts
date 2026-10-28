// =============================================================================
//  Value Realisation — Status Report (PowerPoint builder).
//  Blue Turtle brand (same One-Pager canvas + hero/logo as the CVR deck).
//  Two decks: portfolio (all VR tracks) and per-track status snapshot.
// =============================================================================
import pptxgen from "pptxgenjs";
import { BG_CONTENT, LOGO, HERO } from "./cvr-assets";

const DEEP = "0053B4", BLUE = "0284DD", TEAL = "0091A8", INK = "15303F", MUTED = "5E7789",
  WHITE = "FFFFFF", LINE = "DBE7F0", MIST = "EAF4FC",
  GREEN = "159E7A", AMBER = "E07C24", RED = "C0392B";
const HF = "Calibri", BF = "Calibri";
const W = 13.33, H = 7.5, MX = 0.6, CW = W - MX * 2;

const healthColor = (h: string) => (h === "RED" ? RED : h === "AMBER" ? AMBER : GREEN);

function mk(p: InstanceType<typeof pptxgen>) {
  p.defineLayout({ name: "W", width: W, height: H }); p.layout = "W";
  p.author = "Blue Turtle Technologies";
  let PN = 0;
  const sh = () => ({ type: "outer" as const, color: "0B2540", opacity: 0.18, blur: 5, offset: 2, angle: 90 });
  const bg = (s: pptxgen.Slide) => s.addImage({ data: BG_CONTENT, x: 0, y: 0, w: W, h: H });
  const pill = (s: pptxgen.Slide, eyebrow: string, title: string) => {
    s.addText(eyebrow.toUpperCase(), { x: MX + 0.05, y: 0.14, w: 11.6, h: 0.26, margin: 0, fontFace: BF, fontSize: 11.5, bold: true, color: WHITE, charSpacing: 2 });
    s.addText(title, { x: MX + 0.05, y: 0.38, w: 11.9, h: 0.52, margin: 0, valign: "middle", fontFace: HF, fontSize: 22, bold: true, color: WHITE });
  };
  const pageNum = (s: pptxgen.Slide) => s.addText(String(PN), { x: MX, y: 7.08, w: 0.5, h: 0.3, margin: 0, align: "left", fontFace: BF, fontSize: 9, color: "9AB0BF" });
  const card = (s: pptxgen.Slide, x: number, y: number, w: number, h: number, fill?: string) =>
    s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.09, fill: { color: fill || WHITE }, line: { color: fill && fill !== WHITE ? fill : LINE, width: 1 }, shadow: sh() });
  const content = (eyebrow: string, title: string) => { PN++; const s = p.addSlide(); bg(s); pill(s, eyebrow, title); pageNum(s); return s; };
  const intro = (s: pptxgen.Slide, text: string) => s.addText(text, { x: MX, y: 1.22, w: 12.0, h: 0.5, margin: 0, fontFace: BF, fontSize: 13.5, italic: true, color: TEAL, lineSpacingMultiple: 1.04 });
  const stat = (s: pptxgen.Slide, x: number, y: number, w: number, label: string, value: string, sub: string, accent = INK) => {
    card(s, x, y, w, 1.5, WHITE);
    s.addText(label.toUpperCase(), { x: x + 0.22, y: y + 0.2, w: w - 0.4, h: 0.26, margin: 0, fontFace: BF, fontSize: 9.5, bold: true, color: MUTED, charSpacing: 1 });
    s.addText(value, { x: x + 0.22, y: y + 0.5, w: w - 0.4, h: 0.5, margin: 0, fontFace: HF, fontSize: 23, bold: true, color: accent });
    s.addText(sub, { x: x + 0.22, y: y + 1.04, w: w - 0.4, h: 0.36, margin: 0, fontFace: BF, fontSize: 10, color: MUTED, lineSpacingMultiple: 0.95 });
  };
  const titleHero = (eyebrow: string, title: string, sub: string, meta: string) => {
    const s = p.addSlide(); s.background = { color: WHITE };
    s.addImage({ data: HERO, x: 0, y: 0, w: W, h: 6.41 });
    s.addShape(p.ShapeType.rect, { x: 0, y: 6.38, w: W, h: H - 6.38, fill: { color: WHITE }, line: { type: "none" } });
    s.addText(eyebrow.toUpperCase(), { x: MX, y: 2.55, w: 11.0, h: 0.4, margin: 0, fontFace: BF, fontSize: 15, bold: true, color: MIST, charSpacing: 2 });
    s.addText(title, { x: MX, y: 3.0, w: 9.6, h: 1.3, margin: 0, fontFace: HF, fontSize: 32, bold: true, color: WHITE, lineSpacingMultiple: 0.98 });
    if (sub) s.addText(sub, { x: MX, y: 4.35, w: 9.6, h: 0.5, margin: 0, fontFace: BF, fontSize: 15, color: MIST });
    s.addImage({ data: LOGO, x: W - 2.7, y: 6.62, w: 2.05, h: 0.85 });
    s.addText(meta, { x: MX, y: 6.62, w: 9.4, h: 0.8, valign: "middle", margin: 0, fontFace: BF, fontSize: 11.5, color: MUTED });
    return s;
  };
  const table = (s: pptxgen.Slide, rows: pptxgen.TableRow[], colW: number[], y: number) => {
    s.addTable(rows, { x: MX, y, w: CW, colW, border: { type: "solid", color: "E6EEF5", pt: 1 }, align: "left", valign: "middle", fontFace: BF, fontSize: 10, autoPage: false });
  };
  const th = (t: string) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: DEEP }, fontSize: 10 } });
  const td = (t: string, opts: object = {}) => ({ text: t, options: { color: INK, fontSize: 10, ...opts } });
  return { p, sh, bg, pill, pageNum, card, content, intro, stat, titleHero, table, th, td };
}

// ---------- Portfolio deck ----------
export interface VrTrackRow { code: string; title: string; origin: string; health: string; status: string; realizedPlanned: string; pct: string; milestone: string; openRisks: number; }
export interface VrPortfolioDeckData {
  orgName: string; generated: string;
  totalTracks: number; inFlight: number; atRisk: number;
  health: { GREEN: number; AMBER: number; RED: number };
  valueHeadline: string; valueSub: string;
  currencies: { currency: string; realizedPlanned: string; pct: string; count: number }[];
  tracks: VrTrackRow[];
  attention: string[];
}

export async function buildVrPortfolioDeck(d: VrPortfolioDeckData): Promise<Buffer> {
  const p = new pptxgen();
  const H_ = mk(p);
  p.title = `Value Realisation — Status Report — ${d.orgName}`;

  // 1 · Title
  H_.titleHero("Value Realisation · Portfolio Status Report", d.orgName || "Value Realisation tracks",
    "Status across all Value Realisation tracks", `Blue Turtle Technologies · Value Realisation    |    Generated ${d.generated}`);

  // 2 · Portfolio summary
  {
    const s = H_.content("Portfolio summary", "The portfolio at a glance");
    const cw = (CW - 0.6) / 4;
    H_.stat(s, MX, 1.55, cw, "Tracks", String(d.totalTracks), `${d.inFlight} in flight`, DEEP);
    H_.stat(s, MX + (cw + 0.2), 1.55, cw, "Health", `${d.health.GREEN} green`, `${d.health.AMBER} amber · ${d.health.RED} red`, GREEN);
    H_.stat(s, MX + (cw + 0.2) * 2, 1.55, cw, "At risk", String(d.atRisk), "amber + red", d.atRisk > 0 ? AMBER : INK);
    H_.stat(s, MX + (cw + 0.2) * 3, 1.55, cw, "Value realised", d.valueHeadline, d.valueSub, TEAL);

    s.addText("Value realised by currency", { x: MX, y: 3.4, w: 11, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: INK });
    const cols = Math.min(d.currencies.length, 3);
    const cwv = cols > 0 ? (CW - (cols - 1) * 0.3) / cols : CW;
    d.currencies.slice(0, 3).forEach((c, i) => {
      const x = MX + i * (cwv + 0.3);
      H_.card(s, x, 3.85, cwv, 1.5, WHITE);
      s.addText(`${c.currency}`, { x: x + 0.25, y: 4.05, w: cwv - 1.0, h: 0.4, margin: 0, fontFace: HF, fontSize: 16, bold: true, color: INK });
      s.addText(c.pct, { x: x + cwv - 1.3, y: 4.05, w: 1.05, h: 0.4, align: "right", margin: 0, fontFace: HF, fontSize: 16, bold: true, color: TEAL });
      s.addText(`${c.count} track${c.count === 1 ? "" : "s"}`, { x: x + 0.25, y: 4.5, w: cwv - 0.5, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, color: MUTED });
      s.addText(c.realizedPlanned, { x: x + 0.25, y: 4.82, w: cwv - 0.5, h: 0.4, margin: 0, fontFace: BF, fontSize: 11, color: INK });
    });
    if (d.attention.length) {
      s.addText("Attention needed", { x: MX, y: 5.6, w: 11, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: AMBER });
      s.addText(d.attention.slice(0, 4).map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: INK, breakLine: i < Math.min(d.attention.length, 4) - 1, paraSpaceAfter: 5 } })),
        { x: MX, y: 5.95, w: 12.0, h: 1.0, valign: "top", margin: 0, fontFace: BF, fontSize: 11.5, lineSpacingMultiple: 1.0 });
    }
  }

  // 3 · Tracks table
  {
    const s = H_.content("Tracks", `All Value Realisation tracks (${d.tracks.length})`);
    const head = ["Track", "Health", "Status", "Realised / Planned", "%", "Next milestone", "Risks"].map(H_.th);
    const rows: pptxgen.TableRow[] = [head, ...d.tracks.slice(0, 12).map((t) => [
      H_.td(`${t.code} — ${t.title}\n(${t.origin})`, { fontSize: 9 }),
      H_.td(t.health, { color: healthColor(t.health), bold: true, align: "center" }),
      H_.td(t.status, { fontSize: 9 }),
      H_.td(t.realizedPlanned, { fontSize: 9 }),
      H_.td(t.pct, { align: "center", bold: true, color: TEAL }),
      H_.td(t.milestone, { fontSize: 9 }),
      H_.td(String(t.openRisks), { align: "center", color: t.openRisks > 0 ? AMBER : MUTED }),
    ])];
    H_.table(s, rows, [3.5, 0.95, 1.35, 2.3, 0.75, 2.35, 0.7], 1.45);
    if (d.tracks.length > 12) s.addText(`+ ${d.tracks.length - 12} more — see the app for the full list.`, { x: MX, y: 6.7, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, italic: true, color: MUTED });
  }

  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}

// ---------- Per-track deck ----------
export interface VrTrackDeckData {
  orgName: string; generated: string;
  code: string; title: string; origin: string; owner: string; industry: string;
  health: string; status: string;
  valueHeadline: string; valueSub: string;
  phaseDone: number; phaseTotal: number; currentPhase: string; openRisks: number; targetDate: string;
  objectives?: string; successCriteria?: string;
  phases: { order: number; title: string; status: string; current: boolean }[];
  kpis: { name: string; baseline: string; target: string; latest: string; source: string }[];
  workPackages: { name: string; from: string; due: string; status: string }[];
  benefits: { label: string; realizedPlanned: string; pct: string }[];
  risks: { sev: string; title: string; mitigation?: string }[];
  qbrStory?: string; nextActions: string[]; expansion?: string;
}

export async function buildVrTrackDeck(d: VrTrackDeckData): Promise<Buffer> {
  const p = new pptxgen();
  const H_ = mk(p);
  p.title = `${d.code} — Status Report`;

  // 1 · Title
  H_.titleHero("Value Realisation · Track Status Report", d.title,
    `${d.code}${d.origin ? "  ·  " + d.origin : ""}  ·  ${d.health} / ${d.status}`,
    `${d.orgName}    |    Owner ${d.owner}    |    Generated ${d.generated}`);

  // 2 · Status at a glance
  {
    const s = H_.content("Status", "Status at a glance");
    const cw = (CW - 0.6) / 4;
    H_.stat(s, MX, 1.4, cw, "Value realised", d.valueHeadline, d.valueSub, TEAL);
    H_.stat(s, MX + (cw + 0.2), 1.4, cw, "Phase progress", `${d.phaseDone}/${d.phaseTotal}`, d.currentPhase, DEEP);
    H_.stat(s, MX + (cw + 0.2) * 2, 1.4, cw, "Open risks", String(d.openRisks), "", d.openRisks > 0 ? AMBER : INK);
    H_.stat(s, MX + (cw + 0.2) * 3, 1.4, cw, "Target date", d.targetDate, "", INK);
    if (d.objectives) {
      H_.card(s, MX, 3.2, CW, 2.1, WHITE);
      s.addText("OBJECTIVES", { x: MX + 0.25, y: 3.4, w: 11.5, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, bold: true, color: DEEP, charSpacing: 1 });
      s.addText(d.objectives, { x: MX + 0.25, y: 3.72, w: CW - 0.5, h: 1.0, valign: "top", margin: 0, fontFace: BF, fontSize: 12, color: INK, lineSpacingMultiple: 1.03 });
      if (d.successCriteria) s.addText([{ text: "Success criteria:  ", options: { bold: true, color: INK } }, { text: d.successCriteria, options: { color: MUTED } }],
        { x: MX + 0.25, y: 4.75, w: CW - 0.5, h: 0.5, valign: "top", margin: 0, fontFace: BF, fontSize: 11, lineSpacingMultiple: 1.0 });
    }
    // phase strip
    s.addText("PHASE PROGRESS", { x: MX, y: 5.5, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, bold: true, color: MUTED, charSpacing: 1 });
    const n = d.phases.length || 1; const pw = (CW - (n - 1) * 0.12) / n;
    d.phases.forEach((ph, i) => {
      const x = MX + i * (pw + 0.12);
      const col = ph.status === "COMPLETE" ? GREEN : ph.current ? DEEP : "C9D6E3";
      s.addShape(p.ShapeType.roundRect, { x, y: 5.85, w: pw, h: 0.5, rectRadius: 0.05, fill: { color: col }, line: { type: "none" } });
      s.addText(`${ph.order}. ${ph.title}`, { x, y: 5.85, w: pw, h: 0.5, align: "center", valign: "middle", margin: 0, fontFace: BF, fontSize: 8, bold: ph.current, color: col === "C9D6E3" ? MUTED : WHITE, lineSpacingMultiple: 0.9 });
    });
  }

  // 3 · KPIs + Benefits
  {
    const s = H_.content("Measures", "KPIs & benefits realisation");
    s.addText("KPIs — baseline → target → latest", { x: MX, y: 1.3, w: 11, h: 0.3, margin: 0, fontFace: HF, fontSize: 13, bold: true, color: INK });
    if (d.kpis.length) {
      const head = ["KPI", "Baseline", "Target", "Latest", "Source"].map(H_.th);
      const rows: pptxgen.TableRow[] = [head, ...d.kpis.slice(0, 7).map((k) => [H_.td(k.name), H_.td(k.baseline), H_.td(k.target), H_.td(k.latest, { bold: true, color: TEAL }), H_.td(k.source, { color: MUTED })])];
      H_.table(s, rows, [4.2, 1.7, 1.7, 2.0, 2.5], 1.65);
    } else s.addText("No KPIs recorded.", { x: MX, y: 1.65, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, italic: true, color: MUTED });

    const by = 4.35;
    s.addText("Benefits realisation", { x: MX, y: by, w: 11, h: 0.3, margin: 0, fontFace: HF, fontSize: 13, bold: true, color: INK });
    if (d.benefits.length) {
      d.benefits.slice(0, 5).forEach((b, i) => {
        const y = by + 0.4 + i * 0.45;
        s.addText(b.label, { x: MX, y, w: 6.2, h: 0.4, valign: "middle", margin: 0, fontFace: BF, fontSize: 11, color: INK });
        s.addText(`${b.realizedPlanned}  (${b.pct})`, { x: MX + 6.3, y, w: 5.8, h: 0.4, align: "right", valign: "middle", margin: 0, fontFace: BF, fontSize: 11, color: MUTED });
      });
    } else s.addText("No benefits recorded.", { x: MX, y: by + 0.4, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, italic: true, color: MUTED });
  }

  // 4 · Work packages
  {
    const s = H_.content("Delivery", `Work packages (${d.workPackages.length})`);
    if (d.workPackages.length) {
      const head = ["Work package", "From recommendation", "Due", "Status"].map(H_.th);
      const rows: pptxgen.TableRow[] = [head, ...d.workPackages.slice(0, 10).map((w) => [H_.td(w.name), H_.td(w.from, { color: MUTED }), H_.td(w.due), H_.td(w.status)])];
      H_.table(s, rows, [4.6, 4.0, 1.75, 1.75], 1.4);
    } else s.addText("No work packages.", { x: MX, y: 1.5, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, italic: true, color: MUTED });
  }

  // 5 · Risks + QBR story
  {
    const s = H_.content("Risks & story", "Open risks and the value story");
    s.addText(`Open risks (${d.risks.length})`, { x: MX, y: 1.3, w: 11, h: 0.3, margin: 0, fontFace: HF, fontSize: 13, bold: true, color: INK });
    if (d.risks.length) {
      s.addText(d.risks.slice(0, 6).map((r, i) => ({ text: `[${r.sev}] ${r.title}${r.mitigation ? " — " + r.mitigation : ""}`, options: { bullet: { code: "2022", indent: 14 }, color: INK, breakLine: i < Math.min(d.risks.length, 6) - 1, paraSpaceAfter: 5 } })),
        { x: MX, y: 1.7, w: 12.0, h: 2.0, valign: "top", margin: 0, fontFace: BF, fontSize: 11, lineSpacingMultiple: 1.02 });
    } else s.addText("No open risks.", { x: MX, y: 1.7, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, italic: true, color: MUTED });

    const qy = 4.0;
    s.addText("Latest QBR / EBR — executive value story", { x: MX, y: qy, w: 11, h: 0.3, margin: 0, fontFace: HF, fontSize: 13, bold: true, color: INK });
    H_.card(s, MX, qy + 0.4, CW, 2.5, WHITE);
    s.addText(d.qbrStory || "—", { x: MX + 0.25, y: qy + 0.6, w: CW - 0.5, h: 1.1, valign: "top", margin: 0, fontFace: BF, fontSize: 11.5, color: INK, lineSpacingMultiple: 1.03 });
    const acts = [...d.nextActions.map((a) => `Next best action: ${a}`), ...(d.expansion ? [`Expansion opportunity: ${d.expansion}`] : [])];
    if (acts.length) s.addText(acts.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: MUTED, breakLine: i < acts.length - 1, paraSpaceAfter: 4 } })),
      { x: MX + 0.25, y: qy + 1.75, w: CW - 0.5, h: 1.0, valign: "top", margin: 0, fontFace: BF, fontSize: 10.5, lineSpacingMultiple: 1.0 });
  }

  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}
