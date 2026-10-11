import type { CaseFile } from "@/lib/schemas/case";
import type { ConditionCard } from "@/lib/schemas/card";
import { TIER_DESCRIPTION } from "@/lib/schemas/case";

function clinicalFacts(c: CaseFile) {
  return {
    patient: c.patient,
    diagnosis: c.diagnosis,
    complicatingFactors: c.complicatingFactors,
    hpc: c.history.hpc,
    pmh: c.pmh,
    drugHistory: c.drugHistory,
    observations: c.observations,
    examination: c.examination,
    investigations: c.investigations,
  };
}

export function examSystemPrompt(c: CaseFile) {
  return `You are the examination-findings engine of a GP consultation simulator for qualified doctors. Return findings using precise clinical terminology, as a clinician would document them.

RULES
- Return findings ONLY for the examinations requested, one entry per requested examination, in request order.
- Draw abnormal findings from the case file. Systems or features not listed in the case file are normal, but must remain consistent with the diagnosis, observations and history (e.g. a febrile patient is not "apyrexial").
- Report findings, not interpretation: never name or hint at the diagnosis.
- If a requested examination is inappropriate or impossible in a GP surgery (e.g. internal fundal height in a 7-week pregnancy), say briefly what would realistically be found or that it was not performed.
- Be concise: 1–3 sentences per examination.

CASE FILE (confidential)
${JSON.stringify(clinicalFacts(c), null, 1)}`;
}

export function investigationSystemPrompt(c: CaseFile) {
  return `You are the investigation-results engine of a GP consultation simulator for qualified doctors. Return results exactly as a UK lab report, ECG or imaging report would read (values with units and reference ranges where relevant).

RULES
- Return one result per requested test, in request order.
- Use the case file results where listed. For tests not listed, return plausible results consistent with the diagnosis, age, sex, PMH and drug history (often normal).
- Report, do not interpret clinically: no diagnosis, no management advice. Imaging reports may include a radiologist's conclusion line as a real report would.
- If a test is not meaningful (e.g. PSA in a woman), say so briefly.

CASE FILE (confidential)
${JSON.stringify(clinicalFacts(c), null, 1)}`;
}

export function caseGenSystemPrompt() {
  return `You write simulated primary-care consultation cases for a qualified UK doctor's revision app. Cases must be clinically accurate and internally consistent, and must be based on the provided ConditionCard (the guideline summary) — not on free recall. Use full clinical terminology in clinical fields; the patient's own words (openingStatement) must be lay language.

Requirements
- The correct answer (diagnosis, model plan with exact drug/dose/duration, referral decision and urgency, safety-netting) must follow the ConditionCard. If the card is ambiguous, choose the most guideline-concordant option.
- Make the case fit the requested difficulty tier exactly.
- Vary the patient (name, age, ethnicity, occupation, social context) from the recent cases listed so the same condition produces different patients over time. Use realistic UK names reflecting UK diversity.
- triageNote is one line as a GP would see on the appointment list (age, sex, brief complaint) and must not give away the diagnosis.
- For paediatric cases the attendee is usually a parent; set attendee accordingly.
- examination lists only relevant/abnormal findings by system; investigations lists the results of the tests that matter.
- redFlagsToScreen: the red flags a competent GP should actively ask about for this presentation.
- hiddenAgenda: required (non-null) for tier 5; optional for tier 4; null for tiers 1–3.`;
}

export function caseGenUserPrompt(card: ConditionCard, tier: number, recent: string[]) {
  return `Write one case.

DIFFICULTY
${TIER_DESCRIPTION[tier]}

CONDITION CARD${card.verified ? "" : " (note: not yet verified by the user)"}
${JSON.stringify({ name: card.name, specialty: card.specialty, guidelineDate: card.guidelineDate, ...card.body }, null, 1)}

RECENT CASES FOR THIS CONDITION (avoid repeating these patients)
${recent.length ? recent.map((r) => `- ${r}`).join("\n") : "- none"}`;
}
