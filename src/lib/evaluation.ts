// =============================================================================
//  Evaluation-phase scoring — criteria, weights and weighted-score maths.
//  Shared by the server actions (authoritative recompute) and the matrix UI
//  (live preview). Criteria live as a JSON array on Study.evaluationCriteria.
// =============================================================================

export interface Criterion {
  key: string;
  label: string;
  weight: number; // relative weight; scores are normalised by Σ weights
}

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

/** Default criteria seeded when a study has none yet. */
export const DEFAULT_CRITERIA: Criterion[] = [
  { key: "cost", label: "Cost impact", weight: 4 },
  { key: "performance", label: "Performance", weight: 3 },
  { key: "risk", label: "Risk", weight: 2 },
  { key: "feasibility", label: "Feasibility", weight: 2 },
  { key: "schedule", label: "Schedule", weight: 1 },
];

/**
 * Weighted score = Σ(score_i × weight_i) / Σ(weight_i), on the same 1–5 scale
 * as the individual scores. Returns null if nothing is scored / no weights.
 */
export function weightedScore(
  scores: Record<string, number> | null | undefined,
  criteria: Criterion[]
): number | null {
  if (!scores) return null;
  const totalW = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  if (totalW <= 0) return null;
  let acc = 0;
  let used = false;
  for (const c of criteria) {
    const v = scores[c.key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      acc += v * (Number(c.weight) || 0);
      used = true;
    }
  }
  return used ? acc / totalW : null;
}

/** Coerce an unknown JSON value into a Criterion[] (defensive for Json columns). */
export function asCriteria(value: unknown): Criterion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Criterion => !!c && typeof c === "object" && "key" in c && "label" in c)
    .map((c) => ({ key: String(c.key), label: String(c.label), weight: Number(c.weight) || 0 }));
}

/** Coerce an unknown JSON value into a scores map. */
export function asScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (!Number.isNaN(n)) out[k] = n;
  }
  return out;
}

let counter = 0;
/** Generate a stable-ish criterion key from a label. */
export function criterionKey(label: string): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  counter += 1;
  return (base || "criterion") + "_" + Date.now().toString(36) + counter.toString(36);
}
