"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEngagement } from "@/lib/cs-actions";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/finance";

// Start a continuous Customer Success engagement for an account.
export function NewEngagementForm({ industries }: { industries: { key: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [industryKey, setIndustryKey] = useState(industries[0]?.key ?? "automation");
  const [pending, start] = useTransition();

  async function submit(formData: FormData) {
    start(async () => {
      const id = await createEngagement(formData);
      setOpen(false);
      router.push(`/cs/${id}`);
    });
  }

  if (!open) {
    return <button className="btn-vr" onClick={() => setOpen(true)}>+ New engagement</button>;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink-900/40 p-4" onClick={() => setOpen(false)}>
      <form action={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h3 className="text-lg font-semibold text-ink-900">New Customer Success engagement</h3>
          <p className="mt-1 text-sm text-ink-500">A continuous, whole-relationship engagement for one account — it runs the 8-stage CS lifecycle and links to that account's studies and tracks.</p>
        </div>
        <div>
          <label className="label">Account / customer</label>
          <input name="accountName" required className="input mt-1" placeholder="e.g. ACME Bank" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Solution profile</label>
            <select name="industryKey" className="input mt-1" value={industryKey} onChange={(e) => setIndustryKey(e.target.value)}>
              {industries.map((i) => <option key={i.key} value={i.key}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="currency" defaultValue={DEFAULT_CURRENCY} className="input mt-1">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">ARR (optional)</label>
            <input name="arr" type="number" className="input mt-1" placeholder="e.g. 1200000" />
          </div>
          <div>
            <label className="label">Renewal date (optional)</label>
            <input name="renewalDate" type="date" className="input mt-1" />
          </div>
        </div>
        <div>
          <label className="label">Objectives (optional)</label>
          <textarea name="objectives" rows={2} className="input mt-1" placeholder="What does success look like for this customer?" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn-vr" disabled={pending}>{pending ? "Creating…" : "Create engagement"}</button>
        </div>
      </form>
    </div>
  );
}
