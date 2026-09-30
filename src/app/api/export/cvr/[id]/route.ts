import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCvr } from "@/lib/export/cvr";
import { assembleCvrData, cvrInclude } from "@/lib/export/cvr-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client-facing deliverable: Collaborative Value Review (CVR) as a PowerPoint,
// populated from a completed VE study. Vendor-neutral, Blue Turtle brand.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id }, include: cvrInclude });
  if (!study) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buf = await buildCvr(assembleCvrData(study));
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${study.code}-CVR.pptx"`,
    },
  });
}
