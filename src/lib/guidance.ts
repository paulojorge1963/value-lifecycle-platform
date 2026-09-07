// Maps a phase/stage to the relevant content-template starter text so it can be
// surfaced beside the work (borrowed from the SN Edition's guidance rail).
import { CONTENT_TEMPLATES, type ContentTemplateDef } from "./domain/templates";

const VE_KIND: Record<string, string[]> = {
  ORIENTATION: ["problem_statement"],
  FUNCTION_ANALYSIS: ["function_model"],
  DEVELOPMENT: ["business_case"],
  PRESENTATION: ["presentation_outline"],
};
const VR_KIND: Record<string, string[]> = {
  INTAKE: ["vrp"],
  ADOPTION: ["adoption_plan"],
  VALUE_TRACKING: ["qbr"],
  CLOSEOUT: ["closeout"],
};

export function starterTemplatesFor(kind: "VE" | "VR" | "CS", phaseKey: string, industryKey?: string | null): ContentTemplateDef[] {
  if (kind === "CS") return [];
  const kinds = (kind === "VE" ? VE_KIND : VR_KIND)[phaseKey] ?? [];
  if (!kinds.length) return [];
  return CONTENT_TEMPLATES.filter(
    (t) => t.discipline === kind && kinds.includes(t.kind) && (!t.industryKey || t.industryKey === industryKey),
  );
}
