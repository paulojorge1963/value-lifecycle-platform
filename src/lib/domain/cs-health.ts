// =============================================================================
//  Customer Success — health scorecard factors.
//  Overall score = weighted average of factor scores (0..100). RAG derived from
//  the overall. Factors are config so they can be tuned without code changes.
// =============================================================================

export interface HealthFactorDef {
  key: string;
  label: string;
  weight: number; // sums to 1 across the set
}

export const HEALTH_FACTORS: HealthFactorDef[] = [
  { key: "adoption", label: "Adoption & usage", weight: 0.25 },
  { key: "value", label: "Value delivered", weight: 0.25 },
  { key: "sentiment", label: "Relationship & sentiment", weight: 0.2 },
  { key: "support", label: "Support health", weight: 0.15 },
  { key: "engagement", label: "Engagement & cadence", weight: 0.15 },
];

/** Weighted overall 0..100 from a {factorKey: score} map. */
export function overallScore(scores: Record<string, number>): number {
  const tw = HEALTH_FACTORS.reduce((s, f) => s + f.weight, 0) || 1;
  const sum = HEALTH_FACTORS.reduce((s, f) => s + (scores[f.key] ?? 0) * f.weight, 0);
  return Math.round(sum / tw);
}

/** RAG band for an overall 0..100 score. */
export function ragFor(overall: number): "GREEN" | "AMBER" | "RED" {
  if (overall >= 70) return "GREEN";
  if (overall >= 40) return "AMBER";
  return "RED";
}
