import { prisma } from "@/lib/db";
import { SectionHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [templates, phases, industries] = await Promise.all([
    prisma.contentTemplate.findMany({ orderBy: [{ discipline: "asc" }, { kind: "asc" }] }),
    prisma.phaseTemplate.findMany({ orderBy: [{ discipline: "asc" }, { order: "asc" }] }),
    prisma.industryProfile.findMany(),
  ]);

  const ve = templates.filter((t) => t.discipline === "VE");
  const vr = templates.filter((t) => t.discipline === "VR");

  return (
    <div className="space-y-8">
      <SectionHeader title="Template & content library" desc="Reusable starter text, phase guidance and solution profiles — the reuse layer that feeds guided workflows." />

      {/* Solution profiles */}
      <div>
        <h3 className="mb-3 font-semibold text-ink-900">Solution profiles</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {industries.map((i) => {
            const c = i.config as { studyTypes: string[]; costDrivers: string[]; valueLevers: string[] };
            return (
              <div key={i.id} className="card card-pad">
                <div className="font-medium text-ink-900">{i.name}</div>
                <p className="mt-1 text-xs text-ink-500">{i.description}</p>
                <div className="mt-3 label">Value levers</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.valueLevers.slice(0, 4).map((v) => (
                    <span key={v} className="badge bg-ink-100 text-ink-600">{v}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content templates */}
      <div className="grid gap-8 lg:grid-cols-2">
        <TemplateColumn title="VE deliverable templates" accent="ve" templates={ve} />
        <TemplateColumn title="VR deliverable templates" accent="vr" templates={vr} />
      </div>

      {/* Phase guidance */}
      <div>
        <h3 className="mb-3 font-semibold text-ink-900">Phase guidance library</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {phases.map((p) => (
            <div key={p.id} className="card card-pad">
              <div className="flex items-center gap-2">
                <span className={`badge ${p.discipline === "VE" ? "bg-ve-50 text-ve-700" : "bg-vr-50 text-vr-700"}`}>{p.discipline} · {p.order}</span>
                <span className="font-medium text-ink-900">{p.title}</span>
              </div>
              <p className="mt-1 text-sm text-ink-600">{p.purpose}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateColumn({ title, accent, templates }: { title: string; accent: "ve" | "vr"; templates: { id: string; title: string; kind: string; industryKey: string | null; body: string }[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent === "ve" ? "bg-ve-500" : "bg-vr-500"}`} />
        <h3 className="font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {templates.map((t) => (
          <details key={t.id} className="card card-pad">
            <summary className="flex cursor-pointer items-center justify-between">
              <span className="font-medium text-ink-900">{t.title}</span>
              <span className="flex gap-1.5">
                {t.industryKey && <span className="badge bg-ink-100 text-ink-600">{t.industryKey}</span>}
                <span className="badge bg-ink-100 text-ink-500">{t.kind}</span>
              </span>
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-xs text-ink-700">{t.body}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
