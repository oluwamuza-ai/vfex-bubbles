import type { ConditionCard } from "@/lib/schemas/card";
import type { CaseFile } from "@/lib/schemas/case";
import type { ChatTurn, ExamRecord, InvestigationRecord, PlanSubmission } from "@/lib/schemas/consult";
import { DOMAIN_LABEL, DOMAINS } from "@/lib/schemas/grade";

export function graderSystemPrompt() {
  return `You are an experienced UK GP trainer and examiner (RCGP SCA standard) grading a simulated consultation performed by a qualified doctor. Be rigorous, specific and fair. Use full clinical terminology.

EVIDENCE BASE — IMPORTANT
- Judge clinical content against the ConditionCard (the user's guideline summary) and the CaseFile (the ground truth for this patient). Do not grade from free recall.
- Every guidelinePoint you cite must come from the ConditionCard, and its source must be one of the ConditionCard source URLs.
- If you believe a ConditionCard point is outdated or wrong (e.g. superseded guidance, dose error), do NOT silently correct it in the grade: grade against the card and add a specific note to cardConcerns.
- If the ConditionCard is marked unverified, still use it, but be explicit in cardConcerns about anything that looks doubtful.

DOMAINS — score each 0–10 (10 = what an excellent GP would do; 5 = safe but incomplete; ≤3 = unsafe or major omission)
${DOMAINS.map((d) => `- ${d}: ${DOMAIN_LABEL[d]}`).join("\n")}
Return exactly one entry per domain, in that order.

Domain guidance
- history: presenting complaint explored, relevant systems/PMH/DH/allergies/SH/FH, and active screening of the CaseFile redFlagsToScreen. Missing a red-flag screen is a major omission.
- examination: appropriate, targeted examinations requested (incl. observations where indicated). Do not credit examinations that were not requested.
- investigations: appropriate tests ordered; list unnecessary or low-value tests in unnecessaryTests and penalise them. Not ordering an essential bedside test (e.g. pregnancy test in abdominal pain in a woman of reproductive age) is a major omission.
- diagnosis: working diagnosis correct (or acceptably specific) and sensible differentials.
- management: drug choice, dose, frequency and duration against the card; contraindications/interactions given the case (pregnancy, CKD, allergies, drug history); non-drug advice.
- referral: correct decision, urgency and destination per the card.
- safetyNetting: specific, condition-relevant red-flag safety-netting with a time frame, and appropriate follow-up.
- communication: ideas, concerns and expectations elicited and addressed; hidden agenda found (if present); clear lay explanation and shared decision-making evident in the transcript.

EVIDENCE
- evidence: short direct quotes from the doctor's own words in the transcript, or from their orders/plan (prefix orders with "Ordered:" / "Examined:" / "Plan:"). Never invent quotes. If there is no evidence, return an empty list.
- missed: concrete things that should have been done/asked.
- comment: one or two sentences of examiner feedback.

ALSO RETURN
- modelConsultation: a concise model consultation (≈200–350 words) for this exact patient: key questions, examination, tests, explanation in lay terms, plan with exact doses, referral, safety-netting.
- learningPoints: 1–3 crisp, high-yield learning points tailored to the gaps in this consultation.
- localPracticeNotes: only if LOCAL PRACTICE MODE is on — notes on where Zimbabwe EDLIZ practice or local drug availability would change the plan (still grade against NICE). Otherwise an empty list.`;
}

const rel = (t: number, start: number) => `${Math.max(0, Math.round((t - start) / 1000))}s`;

export function graderUserPrompt(input: {
  card: ConditionCard;
  caseFile: CaseFile;
  tier: number;
  transcript: ChatTurn[];
  exams: ExamRecord[];
  investigations: InvestigationRecord[];
  plan: PlanSubmission;
  startedAt: number;
  submittedAt: number;
  timed: boolean;
  localPractice: { enabled: boolean; formulary: string[]; flagged: string[] };
}) {
  const { card, caseFile, transcript, exams, investigations, plan, startedAt, submittedAt } = input;
  const mins = ((submittedAt - startedAt) / 60000).toFixed(1);
  return `CONDITION CARD — ${card.verified ? "VERIFIED by the user" : "UNVERIFIED (not yet reviewed by the user)"}; guideline date ${card.guidelineDate}
${JSON.stringify({ name: card.name, ...card.body }, null, 1)}

CASE FILE (ground truth; tier ${input.tier})
${JSON.stringify(caseFile, null, 1)}

CONSULTATION — duration ${mins} min${input.timed ? " (10-minute clock was on)" : ""}
Transcript (D = doctor, P = patient; time from start):
${transcript.map((t) => `[${rel(t.at, startedAt)}] ${t.role === "doctor" ? "D" : "P"}: ${t.content}`).join("\n") || "(no history taken)"}

Examinations requested:
${exams.map((e) => `[${rel(e.at, startedAt)}] ${e.request} → ${e.findings}`).join("\n") || "(none)"}

Investigations ordered:
${investigations.map((i) => `[${rel(i.orderedAt, startedAt)}] ${i.test} (${i.kind}) → ${i.result}`).join("\n") || "(none)"}

SUBMITTED PLAN
${JSON.stringify(plan, null, 1)}

LOCAL PRACTICE MODE: ${input.localPractice.enabled ? "ON (Zimbabwe, EDLIZ)" : "OFF"}
${
  input.localPractice.enabled
    ? `Available formulary (user-maintained): ${input.localPractice.formulary.length ? input.localPractice.formulary.join(", ") : "(not provided)"}
Plan drugs not found on the formulary: ${input.localPractice.flagged.length ? input.localPractice.flagged.join(", ") : "none"}`
    : ""
}`;
}
