// =============================================================================
//  Finance engine — ROI / payback / NPV / IRR / LCCA.
//  Pure functions, shared by the business-case builder and the export engine.
// =============================================================================

export interface CashFlowLine {
  label: string;
  kind: "CAPEX" | "OPEX" | "ONE_OFF" | "RECURRING" | "BENEFIT";
  amount: number; // costs positive; BENEFIT rows are inflows
  year?: number | null; // 0 = now
  recurring?: boolean;
}

export interface FinanceResult {
  totalInvestment: number;
  annualNetBenefit: number;
  roiPct: number | null;
  paybackMonths: number | null;
  npv: number | null;
  irrPct: number | null;
  lccByYear: number[]; // cumulative life-cycle cost per year
}

/** Sum of up-front investment: CAPEX + ONE_OFF (year 0 or unspecified). */
export function totalInvestment(lines: CashFlowLine[]): number {
  return lines
    .filter((l) => (l.kind === "CAPEX" || l.kind === "ONE_OFF") && (l.year ?? 0) === 0)
    .reduce((s, l) => s + l.amount, 0);
}

/** Recurring annual net benefit = annual BENEFIT inflows − recurring OPEX. */
export function annualNetBenefit(lines: CashFlowLine[]): number {
  const benefit = lines
    .filter((l) => l.kind === "BENEFIT" && (l.recurring || l.year == null))
    .reduce((s, l) => s + l.amount, 0);
  const opex = lines
    .filter((l) => l.kind === "OPEX" || (l.kind === "RECURRING" && l.recurring !== false))
    .reduce((s, l) => s + l.amount, 0);
  return benefit - opex;
}

export function roiPct(investment: number, annualBenefit: number, horizonYears: number): number | null {
  if (investment <= 0) return null;
  const netOverHorizon = annualBenefit * horizonYears - investment;
  return (netOverHorizon / investment) * 100;
}

export function paybackMonths(investment: number, annualBenefit: number): number | null {
  if (annualBenefit <= 0) return null;
  return (investment / annualBenefit) * 12;
}

/** Build a yearly cash-flow series (net) for horizon, year 0 = −investment. */
export function yearlyNetSeries(lines: CashFlowLine[], horizonYears: number): number[] {
  const invest = totalInvestment(lines);
  const annual = annualNetBenefit(lines);
  const series: number[] = [];
  for (let y = 0; y <= horizonYears; y++) {
    let v = y === 0 ? -invest : 0;
    v += y === 0 ? 0 : annual;
    // Year-specific one-off lines beyond year 0:
    for (const l of lines) {
      if ((l.year ?? 0) === y && y !== 0) {
        v += l.kind === "BENEFIT" ? l.amount : -l.amount;
      }
    }
    series.push(v);
  }
  return series;
}

export function npv(series: number[], discountRatePct: number): number {
  const r = discountRatePct / 100;
  return series.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);
}

/** IRR via bisection on [-0.99, 1.0]. Returns % or null if no sign change. */
export function irrPct(series: number[]): number | null {
  const f = (rate: number) => series.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.99;
  let hi = 1.0;
  const flo = f(lo);
  const fhi = f(hi);
  if (flo * fhi > 0) return null; // no sign change in range
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < 1e-6) return mid * 100;
    if (flo * fmid < 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

export function computeFinance(
  lines: CashFlowLine[],
  opts: { discountRatePct?: number; horizonYears?: number } = {}
): FinanceResult {
  const horizonYears = opts.horizonYears ?? 5;
  const discountRatePct = opts.discountRatePct ?? 10;
  const invest = totalInvestment(lines);
  const annual = annualNetBenefit(lines);
  const series = yearlyNetSeries(lines, horizonYears);

  const lccByYear: number[] = [];
  let cum = 0;
  for (let y = 0; y <= horizonYears; y++) {
    const opexY = lines
      .filter((l) => l.kind === "OPEX" || l.kind === "RECURRING")
      .reduce((s, l) => s + l.amount, 0);
    const capexY = lines
      .filter((l) => (l.kind === "CAPEX" || l.kind === "ONE_OFF") && (l.year ?? 0) === y)
      .reduce((s, l) => s + l.amount, 0);
    cum += capexY + (y === 0 ? 0 : opexY);
    lccByYear.push(cum);
  }

  return {
    totalInvestment: invest,
    annualNetBenefit: annual,
    roiPct: roiPct(invest, annual, horizonYears),
    paybackMonths: paybackMonths(invest, annual),
    npv: npv(series, discountRatePct),
    irrPct: irrPct(series),
    lccByYear,
  };
}

// Supported currencies. ZAR is the platform default (SA-first).
export const CURRENCIES: { code: string; label: string; locale: string }[] = [
  { code: "ZAR", label: "South African Rand (R)", locale: "en-ZA" },
  { code: "USD", label: "US Dollar ($)", locale: "en-US" },
  { code: "EUR", label: "Euro (€)", locale: "en-IE" },
  { code: "GBP", label: "British Pound (£)", locale: "en-GB" },
  { code: "AUD", label: "Australian Dollar (A$)", locale: "en-AU" },
  { code: "NGN", label: "Nigerian Naira (₦)", locale: "en-NG" },
  { code: "KES", label: "Kenyan Shilling (KSh)", locale: "en-KE" },
  { code: "BWP", label: "Botswana Pula (P)", locale: "en-BW" },
];

export const DEFAULT_CURRENCY = "ZAR";

const CURRENCY_LOCALE: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.locale])
);

export function fmtMoney(n: number | null | undefined, currency = DEFAULT_CURRENCY): string {
  if (n == null) return "—";
  const locale = CURRENCY_LOCALE[currency] ?? "en-ZA";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}
