import { NextResponse } from "next/server";
import { LlmError } from "@/lib/llm/client";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Map thrown errors (incl. Anthropic SDK errors) to a JSON response the UI can show. */
export function handleError(e: unknown) {
  console.error(e);
  if (e instanceof LlmError) return jsonError(e.message, 502);
  const err = e as { status?: number; message?: string; name?: string };
  if (err?.name === "AuthenticationError" || err?.status === 401) return jsonError("Anthropic API key missing or invalid — set ANTHROPIC_API_KEY in .env.local (or MOCK_LLM=1).", 502);
  if (err?.status === 429) return jsonError("Rate limited by the Anthropic API — try again shortly.", 503);
  if (err?.status && err.status >= 500) return jsonError("Anthropic API is unavailable — try again shortly.", 503);
  return jsonError(err?.message || "Something went wrong", 500);
}
