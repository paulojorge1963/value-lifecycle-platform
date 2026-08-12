import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatTile, SectionHeader } from "@/components/ui";
import { fmtMoney, fmtPct } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function KpisPage({ searchParams }: { searchParams: Promise<{ role?: string; industry?: string }> }) {
  const { role = "all", industry = "all" } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const studyWhere = { organizationId: user.organizationId, ...(industry !== "all" ? { industryKey: industry } : {}) };

  const [studies, tracks, defs, industries] = await Promise.all([
    prisma.study.findMany({ where: studyWhere, include: { recommendations: true, phases: true, tracks: true, businessCase: true } }),
    prisma.realizationTrack.findMany({ where: studyWhere, include: { benefits: true, workPackages: true, reports: true } }),
    prisma.kpiDefinition.findMany({ orderBy: { discipline: "asc" } }),
    prisma.industryProfile.findMany(),
  ]);

  // --- VE KPIs ---
  const totalAlternatives = await prisma.alternative.count({ where: { study: studyWhere } });
  const recsAccepted = studies.reduce((s, x) => s + x.recommendations.filter((r) => r.status === "ACCEPTED").length, 0);
  const plannedValue = studies.reduce((s, x) => s + (x.estimatedValue ?? 0), 0);
  const rois = studies.map((s) => s.businessCase?.roiPct).filter((v): v is number => v != null);
  const avgRoi = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : null;

  // --- VR KPIs ---
  const realizedValue = tracks.reduce((s, x) => s + (x.realizedValue ?? 0), 0);
  const plannedInTracks = tracks.reduce((s, x) => s + (x.plannedValue ?? 0), 0);
  const variance = plannedInTracks > 0 ? ((realizedValue - plannedInTracks) / plannedInTracks) * 100 : 0;
  const allWp = tracks.flatMap((t) => t.workPackages);
  const onTime = allWp.length ? (allWp.filter((w) => w.status === "DONE").length / allWp.length) * 100 : 0;
  const reports = tracks.reduce((s, x) => s + x.reports.length, 0);

  const roleFilter = (d: string) => role === "all" || (role === "ve" && d === "VE") || (role === "vr" && d === "VR");

  return (
    <div className="space-y-8">
      <SectionHeader title="KPIs & outcomes" desc="Role-specific and shared KPIs across the portfolio, filterable by role and industry." />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <FilterGroup label="Role" param="role" current={role} base={{ industry }} options={[["all", "All"], ["ve", "Value Engineer"], ["vr", "Value Realization"]]} />
        <FilterGroup label="Industry" param="industry" current={industry} base={{ role }} options={[["all", "All"], ...industries.map((i) => [i.key, i.name] as [string, string])]} />
      </div>

      {roleFilter("VE") && (
        <div>
          <div className="mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ve-500" /><h3 className="font-semibold text-ink-900">Value Engineer KPIs</h3></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Alternatives generated" value={String(totalAlternatives)} accent="ve" />
            <StatTile label="Recommendations accepted" value={String(recsAccepted)} accent="ve" />
            <StatTile label="Planned value impact" value={fmtMoney(plannedValue)} accent="ve" />
            <StatTile label="Average ROI / study" value={avgRoi != null ? `${avgRoi.toFixed(0)}%` : "—"} accent="ve" />
          </div>
        </div>
      )}

      {roleFilter("VR") && (
        <div>
          <div className="mb-3 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-vr-500" /><h3 className="font-semibold text-ink-900">Value Realization KPIs</h3></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total realized value" value={fmtMoney(realizedValue)} accent="vr" />
            <StatTile label="Planned vs realized variance" value={fmtPct(variance)} accent="vr" />
            <StatTile label="On-time implementation" value={fmtPct(onTime)} accent="vr" />
            <StatTile label="Value reports delivered" value={String(reports)} accent="vr" />
          </div>
        </div>
      )}

      {/* KPI definitions catalogue */}
      <div>
        <SectionHeader title="KPI catalogue" desc="Definitions, formulas and units — the measurement dictionary for both roles." />
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-ink-200 bg-ink-50"><tr>
              <th className="th">KPI</th><th className="th">Role</th><th className="th">Category</th><th className="th">Unit</th><th className="th">Formula</th>
            </tr></thead>
            <tbody className="divide-y divide-ink-100">
              {defs.filter((d) => roleFilter(d.discipline) && (industry === "all" || !d.industryKey || d.industryKey === industry)).map((d) => (
                <tr key={d.id}>
                  <td className="td"><div className="font-medium text-ink-900">{d.name}</div><div className="text-xs text-ink-400">{d.description}</div></td>
                  <td className="td"><span className={`badge ${d.discipline === "VE" ? "bg-ve-50 text-ve-700" : "bg-vr-50 text-vr-700"}`}>{d.discipline}</span></td>
                  <td className="td text-xs">{d.category.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="td text-xs">{d.unit}</td>
                  <td className="td"><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600">{d.formula ?? "—"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <a href="/api/export/kpis" className="btn-ghost">Export KPI workbook (Excel) ↓</a>
    </div>
  );
}

function FilterGroup({ label, param, current, base, options }: { label: string; param: string; current: string; base: Record<string, string>; options: [string, string][] }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <div className="flex gap-1.5">
        {options.map(([val, lbl]) => {
          const qs = new URLSearchParams({ ...base, [param]: val }).toString();
          const active = current === val;
          return (
            <a key={val} href={`/kpis?${qs}`} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-100"}`}>
              {lbl}
            </a>
          );
        })}
      </div>
    </div>
  );
}
