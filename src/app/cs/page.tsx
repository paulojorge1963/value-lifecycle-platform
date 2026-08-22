import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { StatusBadge, HealthPill, SectionHeader, ProgressBar } from "@/components/ui";
import { fmtMoney } from "@/lib/finance";
import { INDUSTRY_PROFILES } from "@/lib/domain/industries";
import { NewEngagementForm } from "@/components/NewEngagementForm";

export const dynamic = "force-dynamic";

export default async function CsWorkspace() {
  const user = await getCurrentUser();
  if (!user) return null;

  const engagements = await prisma.customerSuccessEngagement.findMany({
    where: { organizationId: user.organizationId },
    include: { industry: true, owner: true, stages: true, _count: { select: { studies: true, tracks: true } } },
    orderBy: { createdAt: "desc" },
  });

  const daysUntil = (d: Date | null) => (d ? Math.round((new Date(d).getTime() - Date.now()) / 86400000) : null);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Customer Success workspace"
        desc="Run the continuous, whole-relationship lifecycle — onboarding through renewal and expansion — linking each account's studies and tracks."
        action={can(user.role, "cs.create") ? (
          <NewEngagementForm industries={INDUSTRY_PROFILES.map((p) => ({ key: p.key, name: p.name }))} />
        ) : null}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {engagements.map((e) => {
          const done = e.stages.filter((s) => s.status === "COMPLETE").length;
          const rd = daysUntil(e.renewalDate);
          return (
            <Link key={e.id} href={`/cs/${e.id}`} className="card block p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-ink-400">{e.code}</div>
                  <h3 className="mt-0.5 font-semibold text-ink-900">{e.accountName}</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={e.status} />
                  <HealthPill health={e.healthOverall} />
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-ink-500">
                  <span>Lifecycle progress</span>
                  <span>stage {done}/8</span>
                </div>
                <ProgressBar pct={(done / 8) * 100} accent="vr" />
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-ink-500">
                <span>{e.industry.name}</span>
                <span>
                  {e._count.studies} studies · {e._count.tracks} tracks
                  {e.arr ? ` · ${fmtMoney(e.arr, e.currency)} ARR` : ""}
                </span>
              </div>
              {e.renewalDate && (
                <div className={`mt-2 text-xs ${rd !== null && rd < 90 ? "text-amber-700" : "text-ink-400"}`}>
                  Renewal {new Date(e.renewalDate).toLocaleDateString()}{rd !== null ? ` · ${rd} days` : ""}
                </div>
              )}
            </Link>
          );
        })}
        {engagements.length === 0 && (
          <div className="card card-pad text-ink-500">
            No engagements yet. Start one with <span className="font-medium">+ New engagement</span> to run the Customer Success lifecycle for an account.
          </div>
        )}
      </div>
    </div>
  );
}
