import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, Money, SectionHeader, ProgressBar } from "@/components/ui";
import { NewStudyForm } from "@/components/NewStudyForm";
import { ImportWorkbook } from "@/components/ImportWorkbook";
import { INDUSTRY_PROFILES } from "@/lib/domain/industries";

export const dynamic = "force-dynamic";

export default async function VeWorkspace() {
  const user = await getCurrentUser();
  if (!user) return null;

  const studies = await prisma.study.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, phases: true, tracks: true, _count: { select: { recommendations: true, alternatives: true } } },
    orderBy: { createdAt: "desc" },
  });

  const studyTypesByIndustry = Object.fromEntries(
    INDUSTRY_PROFILES.map((p) => [p.key, p.config.studyTypes])
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Value Engineering workspace"
        desc="Run structured VE studies through the 8-phase Job Plan and build the business case."
        action={
          can(user.role, "study.create") ? (
            <div className="flex items-center gap-2">
              <ImportWorkbook label="Import workbook" variant="btn-ghost" />
              <NewStudyForm
                industries={INDUSTRY_PROFILES.map((p) => ({ key: p.key, name: p.name }))}
                studyTypesByIndustry={studyTypesByIndustry}
              />
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {studies.map((s) => {
          const done = s.phases.filter((p) => p.status === "COMPLETE").length;
          return (
            <Link key={s.id} href={`/ve/${s.id}`} className="card block p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-ink-400">{s.code}</div>
                  <h3 className="mt-0.5 font-semibold text-ink-900">{s.title}</h3>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-500">
                <span className="badge bg-ve-50 text-ve-700">{s.industry.name}</span>
                {s.studyType && <span className="badge bg-ink-100 text-ink-600">{s.studyType}</span>}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-ink-500">
                  <span>VE Job Plan</span>
                  <span>{done}/8 phases</span>
                </div>
                <ProgressBar pct={(done / 8) * 100} accent="ve" />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-ink-500">
                  {s._count.recommendations} recs · {s._count.alternatives} alternatives
                  {s.tracks.length > 0 && <span className="text-vr-600"> · {s.tracks.length} VR</span>}
                </span>
                <span className="font-semibold text-ink-800"><Money value={s.estimatedValue} currency={s.currency} /></span>
              </div>
            </Link>
          );
        })}
        {studies.length === 0 && (
          <div className="card card-pad text-ink-500">No studies yet. Create your first VE study to begin.</div>
        )}
      </div>
    </div>
  );
}
