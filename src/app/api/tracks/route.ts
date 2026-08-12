import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { handoverToRealization } from "@/lib/actions";

// GET /api/tracks — list realization tracks for the org
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const tracks = await prisma.realizationTrack.findMany({
    where: { organizationId: user.organizationId, ...(status ? { status: status as never } : {}) },
    include: { industry: true, study: true, _count: { select: { workPackages: true, benefits: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: tracks });
}

// POST /api/tracks — create a track by handing over a study (the VE→VR bridge)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ studyId: z.string() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const trackId = await handoverToRealization(parsed.data.studyId);
    const track = await prisma.realizationTrack.findUnique({ where: { id: trackId } });
    return NextResponse.json({ data: track }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Handover failed" }, { status: 400 });
  }
}
