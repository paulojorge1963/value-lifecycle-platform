import { starterTemplatesFor } from "@/lib/guidance";
import { CopyButton } from "@/components/CopyButton";

// Copy-ready starter text for the active phase/stage, from the content templates.
export function StarterTextPanel({ kind, phaseKey, industryKey }: { kind: "VE" | "VR" | "CS"; phaseKey: string; industryKey?: string | null }) {
  const templates = starterTemplatesFor(kind, phaseKey, industryKey);
  if (!templates.length) return null;
  return (
    <div className="mt-4">
      <div className="label mb-2">Starter text — copy into a deliverable & edit</div>
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={`${t.kind}-${t.title}`} className="rounded-lg border border-ink-200 bg-white">
            <div className="flex items-center justify-between border-b border-ink-100 px-3 py-1.5">
              <span className="text-xs font-semibold text-ink-800">{t.title}</span>
              <CopyButton text={t.body} />
            </div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap px-3 py-2 font-sans text-[12.5px] leading-relaxed text-ink-600">{t.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
