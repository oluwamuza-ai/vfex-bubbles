import type { ConditionCard } from "@/lib/schemas/card";

export function rapidFireSystemPrompt() {
  return `You write rapid-fire triage vignettes for a qualified UK GP's revision app. Each vignette is a short telegraphic primary-care scenario; the doctor must decide within seconds between:
- "urgent": emergency, same-day, urgent or suspected-cancer (2WW) referral/assessment;
- "routine": routine referral or routine primary-care management/treatment;
- "safetynet": manage in primary care with safety-netting and review (watchful waiting).
Base every vignette and answer strictly on the provided ConditionCards (red flags, referral criteria, thresholds). Mix the three answers roughly evenly, include near-threshold cases and red flags buried among benign features. Use the conditionId of the card each vignette is based on.`;
}

export function rapidFireUserPrompt(cards: ConditionCard[], n: number) {
  return `Write ${n} vignettes from these cards:\n${JSON.stringify(
    cards.map((c) => ({ conditionId: c.id, name: c.name, redFlags: c.body.redFlags, referral: c.body.referral, thresholds: c.body.thresholds, safetyNetting: c.body.safetyNetting })),
    null,
    1,
  )}`;
}

export const GUIDELINE_DOMAINS = ["nice.org.uk", "cks.nice.org.uk", "bnf.nice.org.uk", "bnfc.nice.org.uk", "rcog.org.uk", "brit-thoracic.org.uk", "sign.ac.uk", "gov.uk", "fsrh.org"];

export function updateResearchPrompt(card: ConditionCard) {
  return `I maintain a revision card summarising UK primary-care guidance for "${card.name}". The card reflects guidance dated ${card.guidelineDate} and cites:
${card.body.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}

Today is ${new Date().toISOString().slice(0, 10)}. Search NICE (guidelines and CKS), BNF/BNFc and, where relevant, RCOG Green-top, BTS/SIGN and the UKHSA Green Book for any guidance on this condition published or updated after ${card.guidelineDate}. Report concretely: what was updated, when, and the specific recommendation, threshold or dose changes relevant to primary care, with URLs. If nothing relevant has changed, say so explicitly.

Current card content for comparison:
${JSON.stringify(card.body, null, 1)}`;
}

export function updateProposalSystemPrompt() {
  return `You update a UK primary-care revision card ("ConditionCard") from research notes. Rules:
- Change only what the research notes support with a cited, newer source; keep everything else verbatim (same wording and order) so the diff is minimal and reviewable.
- Never invent guidance. If the notes find no relevant change, return hasChanges=false and the current body unchanged.
- Update thresholds/doses exactly as stated in the new guidance; add or replace source URLs for anything you change.
- proposedGuidelineDate: the date (YYYY-MM) of the newest guidance the card now reflects.`;
}
