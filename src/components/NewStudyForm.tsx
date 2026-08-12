"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createStudy } from "@/lib/actions";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/finance";

export function NewStudyForm({
  industries,
  studyTypesByIndustry,
}: {
  industries: { key: string; name: string }[];
  studyTypesByIndustry: Record<string, string[]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [industryKey, setIndustryKey] = useState(industries[0]?.key ?? "construction");
  const [pending, start] = useTransition();
  const types = studyTypesByIndustry[industryKey] ?? [];

  async function submit(formData: FormData) {
    start(async () => {
      const id = await createStudy(formData);
      setOpen(false);
      router.push(`/ve/${id}`);
    });
  }

  if (!open) {
    return (
      <button className="btn-ve" onClick={() => setOpen(true)}>
        + New VE study
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
        <h3 className="text-lg font-semibold text-ink-900">New Value Engineering study</h3>
        <div>
          <label className="label">Title</label>
          <input name="title" required className="input mt-1" placeholder="e.g. Pump Station Civil VE" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Industry profile</label>
            <select name="industryKey" className="input mt-1" value={industryKey} onChange={(e) => setIndustryKey(e.target.value)}>
              {industries.map((i) => (
                <option key={i.key} value={i.key}>{i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Study type</label>
            <select name="studyType" className="input mt-1">
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Problem statement (optional)</label>
          <textarea name="problemStatement" rows={3} className="input mt-1" placeholder="What problem or opportunity are we studying, and why now?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estimated value (optional)</label>
            <input name="estimatedValue" type="number" className="input mt-1" placeholder="e.g. 500000" />
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
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className="btn-ve" disabled={pending}>{pending ? "Creating…" : "Create study"}</button>
        </div>
      </form>
    </div>
  );
}
