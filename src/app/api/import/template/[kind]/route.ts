import { NextResponse } from "next/server";
import { buildTemplate, type TemplateKind } from "@/lib/import/templates";

// exceljs needs Node APIs — never run this on the edge runtime.
export const runtime = "nodejs";

const FILENAME: Record<TemplateKind, string> = {
  VE: "VE-Discovery-Template.xlsx",
  VR: "VR-Intake-Template.xlsx",
  CS: "CS-Intake-Template.xlsx",
};

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const upper = kind.toUpperCase();
  const k: TemplateKind = upper === "VR" ? "VR" : upper === "CS" ? "CS" : "VE";
  const wb = buildTemplate(k);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${FILENAME[k]}"`,
    },
  });
}
