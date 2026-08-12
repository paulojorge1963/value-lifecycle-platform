import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// GET /api/studies/:id — full study aggregate
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const study = await prisma.study.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      industry: true, owner: true, phases: { orderBy: { order: "asc" } },
      functions: true, alternatives: true, recommendations: true,
      businessCase: { include: { scenarios: true, costItems: true } },
      handover: true, risks: true, tracks: true,
      kpiTargets: { include: { definition: true } },
    },
  });
  if (!study) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: study });
}
