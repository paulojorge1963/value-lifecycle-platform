// =============================================================================
//  Customer Success — attention signals.
//  Deterministic, computed at render time (no scheduler needed): renewal
//  reminders, health alerts, overdue actions, detractors, low realization.
// =============================================================================

export interface SignalInput {
  status: string;
  healthOverall: string;
  renewalDate: Date | string | null;
  actions?: { dueDate: Date | string | null; status: string }[];
  stakeholders?: { sentiment: string }[];
  tracks?: { plannedValue: number | null; realizedValue: number | null }[];
}

export interface Signal {
  level: "red" | "amber";
  label: string;
}

const daysUntil = (d: Date | string | null) => (d ? Math.round((new Date(d).getTime() - Date.now()) / 86400000) : null);

/** Compute the attention signals for one engagement. Most severe first. */
export function computeSignals(e: SignalInput): Signal[] {
  const out: Signal[] = [];
  const rd = daysUntil(e.renewalDate);
  const openActive = !["RENEWED", "CHURNED", "ARCHIVED"].includes(e.status);

  if (e.healthOverall === "RED") out.push({ level: "red", label: "Health red" });
  else if (e.healthOverall === "AMBER") out.push({ level: "amber", label: "Health amber" });

  if (e.status === "AT_RISK") out.push({ level: "red", label: "Account at risk" });

  if (openActive && rd !== null) {
    if (rd < 0) out.push({ level: "red", label: "Renewal overdue" });
    else if (rd <= 30) out.push({ level: "red", label: `Renewal in ${rd}d` });
    else if (rd <= 90) out.push({ level: "amber", label: `Renewal in ${rd}d` });
  }

  const overdue = (e.actions ?? []).filter((a) => a.status !== "DONE" && a.dueDate && new Date(a.dueDate).getTime() < Date.now()).length;
  if (overdue > 0) out.push({ level: "amber", label: `${overdue} overdue action${overdue > 1 ? "s" : ""}` });

  const detractors = (e.stakeholders ?? []).filter((s) => s.sentiment === "DETRACTOR").length;
  if (detractors > 0) out.push({ level: "amber", label: `${detractors} detractor${detractors > 1 ? "s" : ""}` });

  const planned = (e.tracks ?? []).reduce((s, t) => s + (t.plannedValue ?? 0), 0);
  const realized = (e.tracks ?? []).reduce((s, t) => s + (t.realizedValue ?? 0), 0);
  if (planned > 0 && realized / planned < 0.5) out.push({ level: "amber", label: "Value below 50% of plan" });

  // red before amber
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));
}

/** Numeric priority for ranking engagements by attention (higher = more urgent). */
export function attentionScore(signals: Signal[]): number {
  return signals.reduce((s, x) => s + (x.level === "red" ? 10 : 3), 0);
}
