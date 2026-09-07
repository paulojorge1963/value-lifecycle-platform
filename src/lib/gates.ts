// Completeness-gate helpers (borrowed from the SN Edition).
// Exit criteria come from the domain source of truth (seeded into templates);
// per-phase completeness is stored in the instance's `checklist` Json, keyed by
// criterion index → boolean, e.g. { "0": true, "1": false }.
import { VE_PHASES, VR_PHASES } from "./domain/phases";
import { CS_STAGES } from "./domain/cs-stages";

export type GateKind = "VE" | "VR" | "CS";

export function exitCriteriaFor(kind: GateKind, key: string): string[] {
  if (kind === "VE") return VE_PHASES.find((p) => p.key === key)?.exitCriteria ?? [];
  if (kind === "VR") return VR_PHASES.find((p) => p.key === key)?.exitCriteria ?? [];
  return CS_STAGES.find((s) => s.key === key)?.exitCriteria ?? [];
}

/** Indices/labels of exit criteria not yet ticked in the checklist. */
export function unmetCriteria(criteria: string[], checklist: unknown): string[] {
  const c = (checklist ?? {}) as Record<string, boolean>;
  return criteria.filter((_, i) => !c[String(i)]);
}

export type GateResult = { ok: true } | { ok: false; unmet: string[] };
