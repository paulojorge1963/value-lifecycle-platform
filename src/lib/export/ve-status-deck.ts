// =============================================================================
//  Value Engineering — Portfolio Status Report (PowerPoint builder).
//  Pipeline view across all VE studies. Shares the status-deck kit.
// =============================================================================
import pptxgen from "pptxgenjs";
import { mk, writeDeck, DEEP, TEAL, INK, GREEN, AMBER, MX, CW, HF, BF, WHITE, MUTED } from "./status-deck-kit";

export interface VeStudyRow {
  code: string; title: string; customer: string; status: string;
  phase: string; value: string; roi: string; payback: string; owner: string;
}
export interface VePortfolioDeckData {
  orgName: string; generated: string;
  totalStudies: number; approved: number; atGate: number; active: number;
  valueHeadline: string; valueSub: string;
  currencies: { currency: string; total: string; count: number }[];
  studies: VeStudyRow[];
  attention: string[];
}

export async function buildVePortfolioDeck(d: VePortfolioDeckData): Promise<Buffer> {
  const p = new pptxgen();
  const H_ = mk(p);
  p.title = `Value Engineering — Status Report — ${d.orgName}`;

  // 1 · Title
  H_.titleHero("Value Engineering · Portfolio Status Report", d.orgName || "Value Engineering studies",
    "Pipeline status across all VE studies", `Blue Turtle Technologies · Value Engineering    |    Generated ${d.generated}`);

  // 2 · Pipeline summary
  {
    const s = H_.content("Pipeline summary", "The pipeline at a glance");
    const cw = (CW - 0.6) / 4;
    H_.stat(s, MX, 1.55, cw, "Studies", String(d.totalStudies), `${d.active} active`, DEEP);
    H_.stat(s, MX + (cw + 0.2), 1.55, cw, "Approved", String(d.approved), "business case signed off", GREEN);
    H_.stat(s, MX + (cw + 0.2) * 2, 1.55, cw, "At decision gate", String(d.atGate), "in review", d.atGate > 0 ? AMBER : INK);
    H_.stat(s, MX + (cw + 0.2) * 3, 1.55, cw, "Pipeline value", d.valueHeadline, d.valueSub, TEAL);

    s.addText("Identified value by currency", { x: MX, y: 3.4, w: 11, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: INK });
    const cols = Math.min(d.currencies.length, 3);
    const cwv = cols > 0 ? (CW - (cols - 1) * 0.3) / cols : CW;
    d.currencies.slice(0, 3).forEach((c, i) => {
      const x = MX + i * (cwv + 0.3);
      H_.card(s, x, 3.85, cwv, 1.3, WHITE);
      s.addText(c.currency, { x: x + 0.25, y: 4.05, w: cwv - 1.0, h: 0.4, margin: 0, fontFace: HF, fontSize: 16, bold: true, color: INK });
      s.addText(c.total, { x: x + 0.25, y: 4.5, w: cwv - 0.5, h: 0.4, margin: 0, fontFace: BF, fontSize: 13, color: TEAL });
      s.addText(`${c.count} stud${c.count === 1 ? "y" : "ies"}`, { x: x + cwv - 1.5, y: 4.05, w: 1.25, h: 0.4, align: "right", margin: 0, fontFace: BF, fontSize: 10, color: MUTED });
    });
    if (d.attention.length) {
      s.addText("At the decision gate", { x: MX, y: 5.45, w: 11, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: AMBER });
      H_.bullets(s, d.attention.slice(0, 4), MX, 5.85, 12.0, 1.1, INK);
    }
  }

  // 3 · Studies table
  {
    const s = H_.content("Studies", `All VE studies (${d.studies.length})`);
    const head = ["Study", "Status", "Phase", "Value", "ROI", "Payback", "Owner"].map(H_.th);
    const rows: pptxgen.TableRow[] = [head, ...d.studies.slice(0, 12).map((st) => [
      H_.td(`${st.code} — ${st.title}${st.customer ? `\n${st.customer}` : ""}`, { fontSize: 9 }),
      H_.td(st.status, { fontSize: 9 }),
      H_.td(st.phase, { fontSize: 9 }),
      H_.td(st.value, { fontSize: 9 }),
      H_.td(st.roi, { align: "center", bold: true, color: TEAL }),
      H_.td(st.payback, { align: "center", fontSize: 9 }),
      H_.td(st.owner, { fontSize: 9 }),
    ])];
    H_.table(s, rows, [3.3, 1.3, 2.3, 1.7, 0.9, 1.1, 1.53], 1.45);
    if (d.studies.length > 12) s.addText(`+ ${d.studies.length - 12} more — see the app for the full list.`, { x: MX, y: 6.7, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, italic: true, color: MUTED });
  }

  return writeDeck(p);
}
