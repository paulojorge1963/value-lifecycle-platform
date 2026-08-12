import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Excel export of the KPI catalogue + live study/track KPI instances.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const [defs, targets] = await Promise.all([
    prisma.kpiDefinition.findMany({ orderBy: { discipline: "asc" } }),
    prisma.kpiTarget.findMany({
      include: { definition: true, study: true, track: true, actuals: { orderBy: { periodDate: "asc" } } },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Value Lifecycle Platform";

  const cat = wb.addWorksheet("KPI Catalogue");
  cat.columns = [
    { header: "Key", key: "key", width: 24 },
    { header: "Name", key: "name", width: 32 },
    { header: "Role", key: "discipline", width: 8 },
    { header: "Category", key: "category", width: 18 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Direction", key: "direction", width: 18 },
    { header: "Scope", key: "scope", width: 12 },
    { header: "Formula", key: "formula", width: 46 },
  ];
  cat.getRow(1).font = { bold: true };
  defs.forEach((d) => cat.addRow({ ...d, formula: d.formula ?? "" }));

  const live = wb.addWorksheet("Live KPI Instances");
  live.columns = [
    { header: "KPI", key: "kpi", width: 32 },
    { header: "Attached to", key: "attached", width: 28 },
    { header: "Role", key: "role", width: 8 },
    { header: "Baseline", key: "baseline", width: 14 },
    { header: "Target", key: "target", width: 14 },
    { header: "Latest actual", key: "latest", width: 14 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Data source", key: "source", width: 20 },
    { header: "Owner", key: "owner", width: 18 },
  ];
  live.getRow(1).font = { bold: true };
  targets.forEach((t) => {
    const latest = t.actuals[t.actuals.length - 1];
    live.addRow({
      kpi: t.definition.name,
      attached: t.study ? `Study ${t.study.code}` : t.track ? `Track ${t.track.code}` : "—",
      role: t.definition.discipline,
      baseline: t.baselineValue ?? "",
      target: t.targetValue ?? "",
      latest: latest?.value ?? "",
      unit: t.unit,
      source: t.dataSource ?? "",
      owner: t.ownerName ?? "",
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="value-kpis.xlsx"`,
    },
  });
}
