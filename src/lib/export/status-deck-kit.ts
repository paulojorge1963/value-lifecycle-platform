// =============================================================================
//  Shared PowerPoint kit for the portfolio Status Reports (VE / CS / Lifecycle).
//  Same Blue Turtle brand canvas, hero and logo as the VR status deck and CVR.
//  Keeps every status deck visually identical — one set of primitives.
// =============================================================================
import pptxgen from "pptxgenjs";
import { BG_CONTENT, LOGO, HERO } from "./cvr-assets";

export const DEEP = "0053B4", BLUE = "0284DD", TEAL = "0091A8", INK = "15303F", MUTED = "5E7789",
  WHITE = "FFFFFF", LINE = "DBE7F0", MIST = "EAF4FC",
  GREEN = "159E7A", AMBER = "E07C24", RED = "C0392B";
export const HF = "Calibri", BF = "Calibri";
export const W = 13.33, H = 7.5, MX = 0.6, CW = W - MX * 2;

export const healthColor = (h: string) => (h === "RED" ? RED : h === "AMBER" ? AMBER : GREEN);

/** Build the shared branded primitives against a pptxgen instance. */
export function mk(p: InstanceType<typeof pptxgen>) {
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
  const stat = (s: pptxgen.Slide, x: number, y: number, w: number, label: string, value: string, sub: string, accent: string = INK) => {
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
  const bullets = (s: pptxgen.Slide, items: string[], x: number, y: number, w: number, h: number, color: string = INK) =>
    s.addText(items.map((t, i) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color, breakLine: i < items.length - 1, paraSpaceAfter: 5 } })),
      { x, y, w, h, valign: "top", margin: 0, fontFace: BF, fontSize: 11.5, lineSpacingMultiple: 1.0 });
  return { p, sh, bg, pill, pageNum, card, content, intro, stat, titleHero, table, th, td, bullets };
}

export async function writeDeck(p: InstanceType<typeof pptxgen>): Promise<Buffer> {
  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}
