import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, HealthPill, SectionHeader, ProgressBar } from "@/components/ui";
import { fmtMoney } from "@/lib/finance";
import { INDUSTRY_PROFILES } from "@/lib/domain/industries";
import { NewTrackForm } from "@/components/NewTrackForm";

export const dynamic = "force-dynamic";

export default async function VrWorkspace() {
  const user = await getCurrentUser();
  if (!user) return null;

  const tracks = await prisma.realizationTrack.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, study: true, phases: true, benefits: true, _count: { select: { workPackages: true, reports: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Value Realization workspace"
        desc="Implement approved recommendations, drive adoption, and prove realized value against the business case."
        action={
          can(user.role, "track.create") ? (
            <NewTrackForm industries={INDUSTRY_PROFILES.map((p) => ({ key: p.key, name: p.name }))} />
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {tracks.map((t) => {
          const done = t.phases.filter((p) => p.status === "COMPLETE").length;
          const pct = t.plannedValue && t.plannedValue > 0 ? ((t.realizedValue ?? 0) / t.plannedValue) * 100 : 0;
          return (
            <Link key={t.id} href={`/vr/${t.id}`} className="card block p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-ink-400">
                    {t.code} ·{" "}
                    {t.study ? (
                      <>from <span className="text-ve-600">{t.study.code}</span></>
                    ) : (
                      <span className="text-vr-600">standalone (existing software)</span>
                    )}
                  </div>
                  <h3 className="mt-0.5 font-semibold text-ink-900">{t.title}</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={t.status} />
                  <HealthPill health={t.health} />
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-ink-500">
                  <span>Realized vs planned</span>
                  <span>{fmtMoney(t.realizedValue, t.currency)} / {fmtMoney(t.plannedValue, t.currency)}</span>
                </div>
                <ProgressBar pct={pct} accent="vr" />
              </div>
              <div className="mt-3 flex justify-between text-xs text-ink-500">
                <span>{t.industry.name} · phase {done}/7</span>
                <span>{t._count.workPackages} work pkgs · {t._count.reports} reports</span>
              </div>
            </Link>
          );
        })}
        {tracks.length === 0 && (
          <div className="card card-pad text-ink-500">
            No realization tracks yet. Hand over an approved study from the <Link href="/ve" className="text-ve-700 underline">VE workspace</Link>,
            or start a standalone track above for software already in place.
          </div>
        )}
      </div>
    </div>
  );
}
