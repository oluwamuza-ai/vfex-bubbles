import "server-only";
import type { ConditionCard } from "@/lib/schemas/card";
import { CardUpdateProposal, RapidFireBatch } from "@/lib/schemas/misc";
import { anthropic, GRADER_MODEL, isMock, LlmError, structured } from "./client";
import { GUIDELINE_DOMAINS, rapidFireSystemPrompt, rapidFireUserPrompt, updateProposalSystemPrompt, updateResearchPrompt } from "@/lib/prompts/misc";
import type Anthropic from "@anthropic-ai/sdk";

export async function generateVignettes(cards: ConditionCard[], n: number) {
  if (isMock()) {
    return cards.slice(0, n).map((c, i) => ({
      conditionId: c.id,
      vignette: `(Mock) ${30 + i}y with ${c.body.redFlags[0]?.split(/[,;(—]/)[0]?.toLowerCase() ?? c.name}.`,
      answer: "urgent" as const,
      rationale: c.body.referral[0] ?? "Red flag present.",
      source: c.body.sources[0]?.title ?? "NICE",
    }));
  }
  const out = await structured({ model: GRADER_MODEL, system: rapidFireSystemPrompt(), user: rapidFireUserPrompt(cards, n), schema: RapidFireBatch, effort: "low" });
  const ids = new Set(cards.map((c) => c.id));
  return out.items.filter((i) => ids.has(i.conditionId));
}

/**
 * Two steps: (1) web search restricted to guideline publishers; (2) turn the notes into a
 * minimal proposed card edit (structured). Nothing is applied until the user approves.
 */
export async function proposeCardUpdate(card: ConditionCard): Promise<{ proposal: CardUpdateProposal; citations: string[] }> {
  if (isMock()) {
    const body = structuredClone(card.body);
    body.firstLine = [...body.firstLine, "(Mock) Example new recommendation from a hypothetical update"];
    return { proposal: { hasChanges: true, summary: "(Offline mock) Pretend newer guidance added one first-line recommendation.", proposedGuidelineDate: card.guidelineDate, proposedBody: body }, citations: [] };
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: updateResearchPrompt(card) }];
  let res: Anthropic.Beta.BetaMessage | null = null;
  for (let i = 0; i < 4; i++) {
    res = await anthropic().beta.messages.create({
      model: GRADER_MODEL,
      max_tokens: 16000,
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8, allowed_domains: GUIDELINE_DOMAINS }],
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (res.stop_reason !== "pause_turn") break;
    // Server-side search loop paused: resend with the partial turn to resume.
    messages.push({ role: "assistant", content: res.content });
  }
  if (!res || res.stop_reason === "refusal") throw new LlmError("The update search was declined by the model.");
  const blocks = [...messages.slice(1).flatMap((m) => (Array.isArray(m.content) ? m.content : [])), ...res.content] as Anthropic.Beta.BetaContentBlock[];
  const notes = blocks.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  const citations = new Set<string>();
  for (const b of blocks) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) citations.add(r.url);
    if (b.type === "text") for (const c of b.citations ?? []) if ("url" in c && c.url) citations.add(c.url);
  }
  if (!notes.trim()) throw new LlmError("The search returned no findings.");

  const proposal = await structured({
    model: GRADER_MODEL,
    system: updateProposalSystemPrompt(),
    user: `CURRENT CARD (guideline date ${card.guidelineDate})\n${JSON.stringify(card.body, null, 1)}\n\nRESEARCH NOTES\n${notes}\n\nSOURCES FOUND\n${[...citations].join("\n")}`,
    schema: CardUpdateProposal,
    effort: "medium",
  });
  return { proposal, citations: [...citations] };
}
