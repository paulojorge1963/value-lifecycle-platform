// =============================================================================
//  Value Lifecycle — Executive Status Report (PowerPoint builder).
//  One cross-pillar roll-up: the value thread VE -> VR -> CS. Shares the kit.
// =============================================================================
import pptxgen from "pptxgenjs";
import { mk, writeDeck, BLUE, TEAL, INK, GREEN, MX, CW, HF, BF, WHITE, MUTED } from "./status-deck-kit";

export interface LifecyclePillar {
  count: number; countLabel: string;
  valueHeadline: string; valueSub: string;
  lines: string[]; // 2–3 supporting facts
}
export interface LifecycleDeckData {
  orgName: string; generated: string;
  ve: LifecyclePillar; vr: LifecyclePillar; cs: LifecyclePillar;
  narrative: string;
  attention: string[];
}

export async function buildLifecycleDeck(d: LifecycleDeckData): Promise<Buffer> {
  const p = new pptxgen();
  const H_ = mk(p);
  p.title = `Value Lifecycle — Executive Status Report — ${d.orgName}`;

  // 1 · Title
  H_.titleHero("Value Lifecycle · Executive Status Report", d.orgName || "Value Lifecycle",
    "The value thread — engineered, realised, sustained", `Blue Turtle Technologies    |    Generated ${d.generated}`);

  // 2 · The value thread (three pillars)
  {
    const s = H_.content("The value thread", "Value engineered → realised → sustained");
    const pillars: { accent: string; eyebrow: string; title: string; data: LifecyclePillar }[] = [
      { accent: BLUE, eyebrow: "Value Engineering", title: "Promised", data: d.ve },
      { accent: TEAL, eyebrow: "Value Realisation", title: "Proven", data: d.vr },
      { accent: GREEN, eyebrow: "Customer Success", title: "Sustained", data: d.cs },
    ];
    const gap = 0.3;
    const cw = (CW - gap * 2) / 3;
    pillars.forEach((pl, i) => {
      const x = MX + i * (cw + gap);
      H_.card(s, x, 1.5, cw, 4.9, WHITE);
      s.addShape(p.ShapeType.rect, { x, y: 1.5, w: cw, h: 0.1, fill: { color: pl.accent }, line: { type: "none" } });
      s.addText(pl.eyebrow.toUpperCase(), { x: x + 0.25, y: 1.72, w: cw - 0.5, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, bold: true, color: pl.accent, charSpacing: 1 });
      s.addText(pl.title, { x: x + 0.25, y: 2.0, w: cw - 0.5, h: 0.4, margin: 0, fontFace: HF, fontSize: 18, bold: true, color: INK });
      s.addText(pl.data.valueHeadline, { x: x + 0.25, y: 2.5, w: cw - 0.5, h: 0.55, margin: 0, fontFace: HF, fontSize: 24, bold: true, color: pl.accent });
      s.addText(pl.data.valueSub, { x: x + 0.25, y: 3.05, w: cw - 0.5, h: 0.5, margin: 0, fontFace: BF, fontSize: 10.5, color: MUTED, lineSpacingMultiple: 0.95 });
      s.addText(`${pl.data.count} ${pl.data.countLabel}`, { x: x + 0.25, y: 3.6, w: cw - 0.5, h: 0.3, margin: 0, fontFace: BF, fontSize: 11, bold: true, color: INK });
      H_.bullets(s, pl.data.lines.slice(0, 4), x + 0.25, 3.95, cw - 0.5, 2.3, MUTED);
    });
    s.addText(d.narrative, { x: MX, y: 6.55, w: CW, h: 0.7, valign: "top", margin: 0, fontFace: BF, fontSize: 11.5, italic: true, color: TEAL, lineSpacingMultiple: 1.0 });
  }

  // 3 · Attention across the lifecycle
  if (d.attention.length) {
    const s = H_.content("Attention needed", "Where leadership focus is needed");
    H_.bullets(s, d.attention.slice(0, 10), MX, 1.5, CW, 5.0, INK);
  }

  return writeDeck(p);
}
