import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildCvr, type CvrData } from "@/lib/export/cvr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Download a stored CVR snapshot: rebuilds the deck from the point-in-time
// CvrData captured in the DocumentVersion (not from current study data).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const dv = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!dv || dv.entityType !== "CVR") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = dv.snapshot as unknown as CvrData;
  const buf = await buildCvr(data);
  const fname = `${data.studyCode ?? "study"}-CVR-v${dv.version}.pptx`;
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
