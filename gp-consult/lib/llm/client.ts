import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const PATIENT_MODEL = process.env.PATIENT_MODEL || "claude-haiku-5-5";
export const GRADER_MODEL = process.env.GRADER_MODEL || "claude-opus-5-5";

export const isMock = () => process.env.MOCK_LLM === "1" || process.env.MOCK_LLM === "true";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return _client;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Server-side refusal fallback is supported on Opus/Fable/Sonnet-tier models (not Haiku).
 * Medical content occasionally trips safety classifiers; the fallback re-runs the request
 * on an appropriate model rather than failing the consultation.
 */
function fallbackParams(model: string) {
  if (process.env.LLM_FALLBACKS === "0") return {};
  if (/^claude-(opus|fable|sonnet)/.test(model)) {
    return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
  }
  return {};
}

export class LlmError extends Error {}

/**
 * One structured call: system + user prompt → JSON validated against a Zod schema
 * (Anthropic structured outputs; the SDK parses and validates `parsed_output`).
 */
export async function structured<S extends z.ZodType>(opts: {
  model: string;
  system: string;
  user: string;
  schema: S;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const res = await anthropic().beta.messages.parse({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 16000,
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
    ...fallbackParams(opts.model),
  } as Parameters<ReturnType<typeof anthropic>["beta"]["messages"]["parse"]>[0]);
  if (res.stop_reason === "refusal") throw new LlmError("The model declined this request.");
  if (res.stop_reason === "max_tokens") throw new LlmError("Response was truncated (max_tokens).");
  if (res.parsed_output == null) throw new LlmError("Model output did not match the expected schema.");
  // Re-validate with our own schema (defence in depth: the strict-schema transform drops some constraints).
  return opts.schema.parse(res.parsed_output);
}

export { Anthropic };
