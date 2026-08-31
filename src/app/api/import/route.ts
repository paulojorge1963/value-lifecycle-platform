import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, can, type Capability } from "@/lib/session";
import { importWorkbook, detectKind, deleteByCode, type ImportKind } from "@/lib/import/workbook-import";

// exceljs needs Node APIs — never run this on the edge runtime.
export const runtime = "nodejs";

const CAP_FOR: Record<ImportKind, Capability> = {
  VE: "study.create",
  VR: "track.create",
  CS: "cs.create",
};

/**
 * Upload a Blue Turtle capture workbook and create the VE study / VR track / CS
 * engagement. `dryRun=1` returns the parse plan without writing (for the preview);
 * `replace=1` with a `code` overwrites the existing entity FK-safely first.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No workbook file was uploaded." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "File is too large (max 15 MB)." }, { status: 400 });

  const dryRun = form.get("dryRun") === "1";
  const replace = form.get("replace") === "1";
  const forceCode = (form.get("code") as string | null)?.trim() || undefined;

  const buffer = Buffer.from(await file.arrayBuffer());

  let kind: ImportKind | null;
  try { kind = await detectKind(buffer); }
  catch { return NextResponse.json({ error: "Could not read that file — is it a valid .xlsx workbook?" }, { status: 400 }); }
  if (!kind) return NextResponse.json({ error: "Not a recognised capture workbook (missing '1. Engagement', '1. Track' or '1. Account')." }, { status: 400 });

  if (!can(user.role, CAP_FOR[kind])) {
    return NextResponse.json({ error: `Your role can't create ${kind === "VE" ? "studies" : kind === "VR" ? "tracks" : "engagements"}.` }, { status: 403 });
  }

  try {
    if (replace && forceCode && !dryRun) {
      await deleteByCode(forceCode, user.organizationId, prisma);
    }
    const result = await importWorkbook(buffer, { orgId: user.organizationId, forceCode, dryRun }, prisma);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
