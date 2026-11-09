// =============================================================================
//  Customer Success — Portfolio Health Report (PowerPoint builder).
//  Health & renewal view across all CS engagements. Shares the status-deck kit.
// =============================================================================
import pptxgen from "pptxgenjs";
import { mk, writeDeck, healthColor, DEEP, TEAL, INK, GREEN, AMBER, MX, CW, HF, BF, WHITE, MUTED } from "./status-deck-kit";

export interface CsEngagementRow {
  code: string; account: string; health: string; status: string;
  stage: string; arr: string; renewal: string; openActions: number;
}
export interface CsPortfolioDeckData {
  orgName: string; generated: string;
  totalEngagements: number; health: { GREEN: number; AMBER: number; RED: number };
  atRisk: number; renewalsDue: number;
  arrHeadline: string; arrSub: string;
  currencies: { currency: string; total: string; count: number }[];
  engagements: CsEngagementRow[];
  attention: string[];
}

export async function buildCsPortfolioDeck(d: CsPortfolioDeckData): Promise<Buffer> {
  const p = new pptxgen();
  const H_ = mk(p);
  p.title = `Customer Success — Portfolio Health Report — ${d.orgName}`;

  // 1 · Title
  H_.titleHero("Customer Success · Portfolio Health Report", d.orgName || "Customer Success engagements",
    "Health and renewal status across all engagements", `Blue Turtle Technologies · Customer Success    |    Generated ${d.generated}`);

  // 2 · Portfolio summary
  {
    const s = H_.content("Portfolio summary", "The portfolio at a glance");
    const cw = (CW - 0.6) / 4;
    H_.stat(s, MX, 1.55, cw, "Engagements", String(d.totalEngagements), `${d.health.GREEN} healthy`, DEEP);
    H_.stat(s, MX + (cw + 0.2), 1.55, cw, "Health", `${d.health.GREEN} green`, `${d.health.AMBER} amber · ${d.health.RED} red`, GREEN);
    H_.stat(s, MX + (cw + 0.2) * 2, 1.55, cw, "At risk", String(d.atRisk), "amber + red", d.atRisk > 0 ? AMBER : INK);
    H_.stat(s, MX + (cw + 0.2) * 3, 1.55, cw, "ARR under mgmt", d.arrHeadline, d.arrSub, TEAL);

    s.addText("ARR by currency", { x: MX, y: 3.4, w: 11, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: INK });
    const cols = Math.min(d.currencies.length, 3);
    const cwv = cols > 0 ? (CW - (cols - 1) * 0.3) / cols : CW;
    d.currencies.slice(0, 3).forEach((c, i) => {
      const x = MX + i * (cwv + 0.3);
      H_.card(s, x, 3.85, cwv, 1.3, WHITE);
      s.addText(c.currency, { x: x + 0.25, y: 4.05, w: cwv - 1.0, h: 0.4, margin: 0, fontFace: HF, fontSize: 16, bold: true, color: INK });
      s.addText(c.total, { x: x + 0.25, y: 4.5, w: cwv - 0.5, h: 0.4, margin: 0, fontFace: BF, fontSize: 13, color: TEAL });
      s.addText(`${c.count} acct${c.count === 1 ? "" : "s"}`, { x: x + cwv - 1.5, y: 4.05, w: 1.25, h: 0.4, align: "right", margin: 0, fontFace: BF, fontSize: 10, color: MUTED });
    });
    if (d.attention.length) {
      s.addText(`Attention needed · ${d.renewalsDue} renewal${d.renewalsDue === 1 ? "" : "s"} due within 90 days`, { x: MX, y: 5.45, w: 12, h: 0.35, margin: 0, fontFace: HF, fontSize: 14, bold: true, color: AMBER });
      H_.bullets(s, d.attention.slice(0, 4), MX, 5.85, 12.0, 1.1, INK);
    }
  }

  // 3 · Engagements table
  {
    const s = H_.content("Engagements", `All CS engagements (${d.engagements.length})`);
    const head = ["Engagement", "Health", "Status", "Stage", "ARR", "Renewal", "Actions"].map(H_.th);
    const rows: pptxgen.TableRow[] = [head, ...d.engagements.slice(0, 12).map((e) => [
      H_.td(`${e.code} — ${e.account}`, { fontSize: 9 }),
      H_.td(e.health, { color: healthColor(e.health), bold: true, align: "center" }),
      H_.td(e.status, { fontSize: 9 }),
      H_.td(e.stage, { fontSize: 9 }),
      H_.td(e.arr, { fontSize: 9 }),
      H_.td(e.renewal, { fontSize: 9 }),
      H_.td(String(e.openActions), { align: "center", color: e.openActions > 0 ? AMBER : MUTED }),
    ])];
    H_.table(s, rows, [3.1, 1.0, 1.3, 2.2, 1.7, 1.6, 1.23], 1.45);
    if (d.engagements.length > 12) s.addText(`+ ${d.engagements.length - 12} more — see the app for the full list.`, { x: MX, y: 6.7, w: 11, h: 0.3, margin: 0, fontFace: BF, fontSize: 10, italic: true, color: MUTED });
  }

  return writeDeck(p);
}
