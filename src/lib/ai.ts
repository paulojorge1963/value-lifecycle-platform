// =============================================================================
//  AI starter-text generation (Anthropic SDK).
//
//  Used to draft deliverable sections (recommendation detail, creative
//  alternatives) from study context. Gated on ANTHROPIC_API_KEY — when it is
//  unset, callers fall back to the static template library, so the feature
//  degrades gracefully with no external dependency.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";

// Model per the Anthropic guidance: default to the latest, most capable Claude.
const MODEL = "claude-opus-5";

export function isAiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!cached) cached = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return cached;
}

/**
 * Generate a JSON object matching `schema`. Uses structured outputs so the
 * response is guaranteed parseable. Short deliverable snippets → low effort,
 * modest max_tokens (kept well under the non-streaming timeout).
 */
export async function generateJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    // `format` guarantees valid JSON; `effort: low` keeps this fast + cheap.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  } as Anthropic.Messages.MessageCreateParamsNonStreaming);

  // Benign business content won't trip safety classifiers, but guard anyway so
  // the caller can fall back to a template on a refusal.
  if (res.stop_reason === "refusal") throw new Error("AI request was declined");

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("AI returned no text");
  return JSON.parse(block.text) as T;
}
