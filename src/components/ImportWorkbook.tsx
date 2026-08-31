"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Plan = { code: string; counts?: Record<string, unknown> } & Record<string, unknown>;
type Preview = { kind: "VE" | "VR" | "CS"; entity: string; code: string; title: string; plan: Plan; entityId?: string; existingId?: string };

const KIND_NAME = { VE: "Value Engineering study", VR: "Value Realization track", CS: "Customer Success engagement" } as const;
const ROUTE = { VE: "/ve", VR: "/vr", CS: "/cs" } as const;

export function ImportWorkbook({ label = "Import workbook", variant = "btn-primary" }: { label?: string; variant?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [replace, setReplace] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null); setCode(""); setReplace(false); setPreview(null); setError(null); setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }
  function close() { setOpen(false); reset(); }

  async function send(dryRun: boolean): Promise<Preview | null> {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    if (code.trim()) fd.append("code", code.trim());
    if (dryRun) fd.append("dryRun", "1");
    if (!dryRun && replace) fd.append("replace", "1");
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Import failed."); return null; }
    return json as Preview;
  }

  async function onFile(f: File | null) {
    setFile(f); setPreview(null); setError(null); setReplace(false);
    if (!f) return;
    setBusy(true);
    const p = await sendWith(f, true);
    setBusy(false);
    if (p) { setPreview(p); if (p.code && !code) setCode(p.code); }
  }
  // small helper so onFile can use the freshly-picked file before state settles
  async function sendWith(f: File, dryRun: boolean): Promise<Preview | null> {
    const fd = new FormData();
    fd.append("file", f);
    if (code.trim()) fd.append("code", code.trim());
    if (dryRun) fd.append("dryRun", "1");
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Import failed."); return null; }
    return json as Preview;
  }

  async function refreshPreview() {
    setBusy(true); setError(null);
    const p = await send(true);
    setBusy(false);
    if (p) setPreview(p);
  }

  async function doImport() {
    setBusy(true); setError(null);
    const p = await send(false);
    setBusy(false);
    if (p?.entityId) { close(); router.push(`${ROUTE[p.kind]}/${p.entityId}`); router.refresh(); }
  }

  if (!open) {
    return <button className={variant} onClick={() => setOpen(true)}>{label}</button>;
  }

  const clash = !!preview?.existingId;
  const counts = preview?.plan?.counts ?? null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink-900/40 p-4" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h3 className="text-lg font-semibold text-ink-900">Import a capture workbook</h3>
          <p className="mt-0.5 text-sm text-ink-500">Upload a filled VE Discovery, VR Intake or CS Intake workbook. The type is detected automatically.</p>
        </div>

        <div>
          <label className="label">Workbook (.xlsx)</label>
          <input ref={fileRef} type="file" accept=".xlsx" className="input mt-1"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>

        <div>
          <label className="label">Code (optional — leave blank to auto-generate)</label>
          <input className="input mt-1" placeholder="e.g. VE-2026-060" value={code}
            onChange={(e) => setCode(e.target.value)} onBlur={() => file && refreshPreview()} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {busy && !preview && <div className="text-sm text-ink-500">Reading workbook…</div>}

        {preview && (
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
            <div className="flex items-center justify-between">
              <span className="badge bg-ve-50 text-ve-700">{KIND_NAME[preview.kind]}</span>
              <span className="font-mono text-sm font-semibold text-ink-900">{preview.code}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-ink-900">{preview.title}</p>
            {counts && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(counts).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-ink-100 pb-0.5">
                    <dt className="text-ink-500">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
                    <dd className="font-medium tabular-nums text-ink-800">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {clash && (
              <label className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-0.5" />
                <span><b>{preview.code} already exists.</b> Tick to replace it (the existing one is deleted first), or change the code above to import as new.</span>
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
          <button type="button" className="btn-primary" disabled={busy || !preview || (clash && !replace)} onClick={doImport}>
            {busy ? "Importing…" : clash && replace ? "Replace & import" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
