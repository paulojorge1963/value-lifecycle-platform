import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/session";
import { VE_PHASES } from "@/lib/domain/phases";

// GET /api/studies — list studies for the current org (filter: ?industry=&status=)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const studies = await prisma.study.findMany({
    where: {
      organizationId: user.organizationId,
      ...(industry ? { industryKey: industry } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: { industry: true, _count: { select: { recommendations: true, tracks: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: studies });
}

const CreateStudy = z.object({
  title: z.string().min(1),
  industryKey: z.string(),
  studyType: z.string().optional(),
  problemStatement: z.string().optional(),
  estimatedValue: z.number().optional(),
});

// POST /api/studies — create a study (seeds the 8 VE phases)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "study.create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = CreateStudy.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const year = new Date().getFullYear();
  const count = await prisma.study.count();
  const study = await prisma.study.create({
    data: {
      code: `VE-${year}-${String(count + 1).padStart(3, "0")}`,
      ...parsed.data,
      organizationId: user.organizationId,
      ownerId: user.id,
      status: "DRAFT",
      startedAt: new Date(),
      phases: { create: VE_PHASES.map((p) => ({ phase: p.key as never, order: p.order })) },
    },
  });
  return NextResponse.json({ data: study }, { status: 201 });
}
