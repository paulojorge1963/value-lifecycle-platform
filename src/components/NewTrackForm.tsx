"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRealizationTrack } from "@/lib/actions";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/finance";

// Start a standalone Value Realization track for software already in place at a
// customer — no VE study required. The VE→VR handover stays the primary path;
// this is the "existing software, VRM-only" entry point.
export function NewTrackForm({ industries }: { industries: { key: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [industryKey, setIndustryKey] = useState(industries[0]?.key ?? "automation");
  const [pending, start] = useTransition();

  async function submit(formData: FormData) {
    start(async () => {
      const id = await createRealizationTrack(formData);
      setOpen(false);
      router.push(`/vr/${id}`);
    });
  }

  if (!open) {
    return (
      <button className="btn-vr" onClick={() => setOpen(true)}>
        + New realization track
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink-900/40 p-4" onClick={() => setOpen(false)}>
      <form
        action={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div>
          <h3 className="text-lg font-semibold text-ink-900">Start a Value Realization track</h3>
          <p className="mt-1 text-sm text-ink-500">
            For software already in place — run the realization lifecycle to drive adoption and prove value, with no VE study.
          </p>
        </div>
        <div>
          <label className="label">Title</label>
          <input name="title" required className="input mt-1" placeholder="e.g. Control-M value assurance — ACME" />
        </div>
        <div>
          <label className="label">Solution profile</label>
          <select name="industryKey" className="input mt-1" value={industryKey} onChange={(e) => setIndustryKey(e.target.value)}>
            {industries.map((i) => (
              <option key={i.key} value={i.key}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Objectives (optional)</label>
          <textarea name="objectives" rows={2} className="input mt-1" placeholder="What value are we protecting or proving from the existing deployment?" />
        </div>
        <div>
          <label className="label">Success criteria (optional)</label>
          <textarea name="successCriteria" rows={2} className="input mt-1" placeholder="How will we know value has been realized?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Planned value (optional)</label>
            <input name="plannedValue" type="number" className="input mt-1" placeholder="e.g. 500000" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="currency" defaultValue={DEFAULT_CURRENCY} className="input mt-1">
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Target date (optional)</label>
          <input name="targetDate" type="date" className="input mt-1" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn-vr" disabled={pending}>{pending ? "Creating…" : "Create track"}</button>
        </div>
      </form>
    </div>
  );
}
