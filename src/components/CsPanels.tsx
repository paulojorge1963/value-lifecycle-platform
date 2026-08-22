"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HEALTH_FACTORS } from "@/lib/domain/cs-health";
import {
  addStakeholder, deleteStakeholder, addAction, setActionStatus,
  recordHealthScore, saveRenewalPlan, saveGrowthPlan, saveSuccessPlan,
} from "@/lib/cs-actions";

type Factor = { key: string; label: string; score: number; weight: number };

function ragCls(overall: number) {
  return overall >= 70 ? "text-emerald-700" : overall >= 40 ? "text-amber-700" : "text-red-600";
}
const SENTIMENT_CLS: Record<string, string> = {
  PROMOTER: "bg-emerald-50 text-emerald-700",
  NEUTRAL: "bg-ink-100 text-ink-600",
  DETRACTOR: "bg-red-50 text-red-700",
};

// ---- Health Scorecard ------------------------------------------------------
export function HealthScorecard({
  engagementId, latest, history, canEdit,
}: {
  engagementId: string;
  latest: { periodLabel: string; overall: number; factors: Factor[]; note: string | null } | null;
  history: { periodLabel: string; overall: number }[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">Health Scorecard</h2>
        {latest && <span className={`text-2xl font-bold ${ragCls(latest.overall)}`}>{latest.overall}<span className="text-sm text-ink-400">/100</span></span>}
      </div>
      {latest ? (
        <>
          <div className="mt-3 space-y-1.5">
            {latest.factors.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="w-40 text-sm text-ink-600">{f.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-ink-100">
                  <div className={`h-full ${f.score >= 70 ? "bg-emerald-500" : f.score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, Math.min(100, f.score))}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-ink-500">{f.score}</span>
              </div>
            ))}
          </div>
          {history.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {history.map((h) => <span key={h.periodLabel} className={`rounded bg-ink-100 px-2 py-0.5 ${ragCls(h.overall)}`}>{h.periodLabel}: {h.overall}</span>)}
            </div>
          )}
        </>
      ) : <p className="mt-2 text-sm text-ink-500">No health score yet.</p>}

      {canEdit && (
        <div className="mt-4">
          {!open ? (
            <button className="btn-ghost" onClick={() => setOpen(true)}>Record health score</button>
          ) : (
            <form
              className="space-y-2 rounded-lg border border-ink-200 p-3"
              action={(fd) => start(async () => { await recordHealthScore(engagementId, fd); setOpen(false); router.refresh(); })}
            >
              <input name="periodLabel" placeholder="Period e.g. 2026-Q3" className="input text-sm" required />
              {HEALTH_FACTORS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="w-40 text-ink-600">{f.label}</span>
                  <input name={`f_${f.key}`} type="number" min={0} max={100} defaultValue={70} className="w-20 rounded border border-ink-300 px-2 py-1 text-sm" />
                  <span className="text-xs text-ink-400">/100 · w{f.weight}</span>
                </label>
              ))}
              <input name="note" placeholder="Note (optional)" className="input text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-vr" disabled={pending}>{pending ? "…" : "Save score"}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Action Log ------------------------------------------------------------
const ACTION_NEXT: Record<string, { label: string; value: string }> = {
  OPEN: { label: "Start", value: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Done", value: "DONE" },
  BLOCKED: { label: "Resume", value: "IN_PROGRESS" },
  DONE: { label: "Reopen", value: "OPEN" },
};
export function ActionLog({ engagementId, actions, canEdit }: { engagementId: string; actions: { id: string; title: string; owner: string | null; dueDate: string | null; status: string }[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="card card-pad">
      <h2 className="mb-3 font-semibold text-ink-900">Action Log</h2>
      <div className="space-y-1.5">
        {actions.map((a) => {
          const next = ACTION_NEXT[a.status];
          return (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded border border-ink-100 px-3 py-1.5 text-sm">
              <div>
                <span className={a.status === "DONE" ? "text-ink-400 line-through" : "text-ink-800"}>{a.title}</span>
                <span className="ml-2 text-xs text-ink-400">{a.owner ?? "—"}{a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ""}</span>
              </div>
              {canEdit && next && (
                <button className="btn border border-ink-200 px-2 py-0.5 text-xs text-ink-600 hover:bg-ink-100" disabled={pending} onClick={() => start(() => setActionStatus(engagementId, a.id, next.value))}>
                  {pending ? "…" : next.label}
                </button>
              )}
            </div>
          );
        })}
        {actions.length === 0 && <p className="text-sm text-ink-500">No actions yet.</p>}
      </div>
      {canEdit && (
        <form className="mt-3 flex flex-wrap items-center gap-1.5" action={(fd) => start(async () => { await addAction(engagementId, fd); router.refresh(); })}>
          <input name="title" placeholder="New action" className="min-w-[10rem] flex-1 rounded border border-ink-300 px-2 py-1 text-sm" required />
          <input name="owner" placeholder="Owner" className="w-28 rounded border border-ink-300 px-2 py-1 text-sm" />
          <input name="dueDate" type="date" className="rounded border border-ink-300 px-2 py-1 text-sm" />
          <button className="btn-vr" disabled={pending}>{pending ? "…" : "Add"}</button>
        </form>
      )}
    </div>
  );
}

// ---- Stakeholder Map -------------------------------------------------------
export function StakeholderPanel({ engagementId, stakeholders, canEdit }: { engagementId: string; stakeholders: { id: string; name: string; title: string | null; role: string | null; influence: number | null; sentiment: string }[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="card card-pad">
      <h2 className="mb-3 font-semibold text-ink-900">Stakeholder Map</h2>
      <div className="space-y-1.5">
        {stakeholders.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-medium text-ink-800">{s.name}</span>
              <span className="text-xs text-ink-400"> · {[s.title, s.role].filter(Boolean).join(" · ") || "—"}{s.influence ? ` · influence ${s.influence}/5` : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${SENTIMENT_CLS[s.sentiment] ?? ""}`}>{s.sentiment.toLowerCase()}</span>
              {canEdit && <button className="text-xs text-ink-400 hover:text-red-600" disabled={pending} onClick={() => start(async () => { await deleteStakeholder(engagementId, s.id); router.refresh(); })}>✕</button>}
            </div>
          </div>
        ))}
        {stakeholders.length === 0 && <p className="text-sm text-ink-500">No stakeholders mapped.</p>}
      </div>
      {canEdit && (
        <div className="mt-3">
          {!open ? (
            <button className="btn-ghost" onClick={() => setOpen(true)}>+ Add stakeholder</button>
          ) : (
            <form className="space-y-2 rounded-lg border border-ink-200 p-3" action={(fd) => start(async () => { await addStakeholder(engagementId, fd); setOpen(false); router.refresh(); })}>
              <input name="name" placeholder="Name" className="input text-sm" required />
              <div className="flex gap-2">
                <input name="title" placeholder="Title" className="input text-sm" />
                <input name="role" placeholder="Role (champion, buyer…)" className="input text-sm" />
              </div>
              <div className="flex gap-2">
                <input name="influence" type="number" min={1} max={5} placeholder="Influence 1–5" className="input text-sm" />
                <select name="sentiment" defaultValue="NEUTRAL" className="input text-sm">
                  <option value="PROMOTER">Promoter</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="DETRACTOR">Detractor</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-vr" disabled={pending}>{pending ? "…" : "Add"}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Renewal / Growth / Success plans (simple upsert forms) ----------------
function CollapsibleForm({ title, summary, canEdit, children, onSubmit }: { title: string; summary: string; canEdit: boolean; children: React.ReactNode; onSubmit: (fd: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">{title}</h2>
        {canEdit && <button className="btn-ghost" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Edit"}</button>}
      </div>
      {!open ? (
        <p className="mt-2 whitespace-pre-line text-sm text-ink-600">{summary || "—"}</p>
      ) : (
        <form className="mt-3 space-y-2" action={(fd) => start(async () => { await onSubmit(fd); setOpen(false); router.refresh(); })}>
          {children}
          <div className="flex justify-end gap-2"><button className="btn-vr" disabled={pending}>{pending ? "…" : "Save"}</button></div>
        </form>
      )}
    </div>
  );
}

export function RenewalPlanForm({ engagementId, plan, canEdit }: { engagementId: string; plan: { renewalDate: string | null; stage: string | null; valueSummary: string | null; risks: string | null; procurementStatus: string | null; plannedActions: string | null } | null; canEdit: boolean }) {
  const summary = plan ? [plan.renewalDate ? `Renewal: ${new Date(plan.renewalDate).toLocaleDateString()}` : "", plan.stage, plan.valueSummary, plan.risks ? `Risks: ${plan.risks}` : "", plan.plannedActions].filter(Boolean).join("\n") : "";
  return (
    <CollapsibleForm title="Renewal Plan" summary={summary} canEdit={canEdit} onSubmit={(fd) => saveRenewalPlan(engagementId, fd)}>
      <input name="renewalDate" type="date" defaultValue={plan?.renewalDate ? plan.renewalDate.slice(0, 10) : ""} className="input text-sm" />
      <input name="stage" placeholder="Stage (e.g. 6–9 months out)" defaultValue={plan?.stage ?? ""} className="input text-sm" />
      <textarea name="valueSummary" rows={2} placeholder="Value summary" defaultValue={plan?.valueSummary ?? ""} className="input text-sm" />
      <textarea name="risks" rows={2} placeholder="Risks & gaps" defaultValue={plan?.risks ?? ""} className="input text-sm" />
      <input name="procurementStatus" placeholder="Procurement status" defaultValue={plan?.procurementStatus ?? ""} className="input text-sm" />
      <textarea name="plannedActions" rows={2} placeholder="Planned actions" defaultValue={plan?.plannedActions ?? ""} className="input text-sm" />
    </CollapsibleForm>
  );
}

export function GrowthPlanForm({ engagementId, plan, canEdit }: { engagementId: string; plan: { triggers: string | null; narrative: string | null; targetValue: number | null } | null; canEdit: boolean }) {
  const summary = plan ? [plan.triggers ? `Triggers: ${plan.triggers}` : "", plan.targetValue ? `Target value: ${plan.targetValue.toLocaleString()}` : "", plan.narrative].filter(Boolean).join("\n") : "";
  return (
    <CollapsibleForm title="Growth Plan" summary={summary} canEdit={canEdit} onSubmit={(fd) => saveGrowthPlan(engagementId, fd)}>
      <textarea name="triggers" rows={2} placeholder="Expansion triggers & opportunities" defaultValue={plan?.triggers ?? ""} className="input text-sm" />
      <input name="targetValue" type="number" placeholder="Target expansion value" defaultValue={plan?.targetValue ?? ""} className="input text-sm" />
      <textarea name="narrative" rows={2} placeholder="Growth narrative" defaultValue={plan?.narrative ?? ""} className="input text-sm" />
    </CollapsibleForm>
  );
}

export function SuccessPlanForm({ engagementId, objectives, successPlan, canEdit }: { engagementId: string; objectives: string | null; successPlan: { commitments?: string | null; successCriteria?: string | null; notes?: string | null } | null; canEdit: boolean }) {
  const summary = [objectives ? `Objectives: ${objectives}` : "", successPlan?.successCriteria ? `Success criteria: ${successPlan.successCriteria}` : "", successPlan?.commitments ? `Commitments: ${successPlan.commitments}` : "", successPlan?.notes].filter(Boolean).join("\n");
  return (
    <CollapsibleForm title="Customer Success Plan" summary={summary} canEdit={canEdit} onSubmit={(fd) => saveSuccessPlan(engagementId, fd)}>
      <textarea name="objectives" rows={2} placeholder="Objectives" defaultValue={objectives ?? ""} className="input text-sm" />
      <textarea name="successCriteria" rows={2} placeholder="Success criteria" defaultValue={successPlan?.successCriteria ?? ""} className="input text-sm" />
      <textarea name="commitments" rows={2} placeholder="Commitments" defaultValue={successPlan?.commitments ?? ""} className="input text-sm" />
      <textarea name="notes" rows={2} placeholder="Notes" defaultValue={successPlan?.notes ?? ""} className="input text-sm" />
    </CollapsibleForm>
  );
}
