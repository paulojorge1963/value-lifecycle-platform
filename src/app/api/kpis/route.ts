import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/kpis — the KPI definition catalogue (filter: ?discipline=VE|VR&industry=)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const discipline = searchParams.get("discipline") ?? undefined;
  const industry = searchParams.get("industry");
  const defs = await prisma.kpiDefinition.findMany({
    where: {
      ...(discipline ? { discipline: discipline as never } : {}),
      ...(industry ? { OR: [{ industryKey: industry }, { industryKey: null }] } : {}),
    },
    orderBy: [{ discipline: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ data: defs });
}
