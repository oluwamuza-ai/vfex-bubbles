import { z } from "zod";

export const Tier = z.number().int().min(1).max(5);

export const TIER_DESCRIPTION: Record<number, string> = {
  1: "Tier 1 — classic textbook presentation, cooperative historian, single problem.",
  2: "Tier 2 — standard presentation where the challenge is correct first-line management (drug, dose, duration) per guideline.",
  3: "Tier 3 — atypical presentation or a complicating factor (pregnancy/breastfeeding, CKD, frailty/elderly, polypharmacy, drug interaction or contraindication).",
  4: "Tier 4 — escalation decisions: exact thresholds, referral timing/urgency, second-line therapy, with a consent/capacity, safeguarding or shared-decision overlay.",
  5: "Tier 5 — multi-problem consultation: a hidden agenda ('while I'm here, doctor...'), a red flag buried in noise, vague or tangential historian, competing priorities in 10 minutes.",
};

export const DrugEntry = z.object({
  drug: z.string(),
  dose: z.string(),
  notes: z.string(),
});

export const CaseFile = z.object({
  patient: z.object({
    name: z.string(),
    age: z.string().describe("e.g. '54' or '18 months'"),
    sex: z.enum(["male", "female"]),
    occupation: z.string(),
    background: z.string().describe("Brief social/cultural context relevant to the consultation"),
  }),
  triageNote: z.string().describe("One-line receptionist/triage note as a GP would see it; must not reveal the diagnosis"),
  presentingComplaint: z.string(),
  historianStyle: z.string().describe("How the patient (or parent) talks: e.g. anxious, minimising, tangential, vague"),
  attendee: z.string().describe("Who is speaking, e.g. 'patient' or 'mother of the child'"),
  history: z.object({
    hpc: z.string().describe("Full history of presenting complaint in clinical terms"),
    openingStatement: z.string().describe("What the patient says first, in lay words"),
    volunteered: z.array(z.string()).describe("Things the patient will plausibly volunteer without being asked"),
    onlyIfAsked: z.array(z.string()).describe("Positive features revealed only if specifically asked"),
    pertinentNegatives: z.array(z.string()).describe("Features that are absent if asked about"),
    ideas: z.string(),
    concerns: z.string(),
    expectations: z.string(),
    hiddenAgenda: z.string().nullable().describe("Second issue raised late ('while I'm here'), or null"),
  }),
  pmh: z.array(z.string()),
  drugHistory: z.array(DrugEntry),
  allergies: z.array(z.string()),
  socialHistory: z.string(),
  familyHistory: z.string(),
  observations: z.object({
    heartRate: z.string(),
    bloodPressure: z.string(),
    respiratoryRate: z.string(),
    spo2: z.string(),
    temperature: z.string(),
    other: z.string().describe("e.g. capillary refill, weight, BMI, peak flow, or empty string"),
  }),
  examination: z
    .array(z.object({ system: z.string(), findings: z.string() }))
    .describe("Abnormal or specifically relevant findings by system; unlisted systems are normal"),
  investigations: z
    .array(z.object({ test: z.string(), result: z.string() }))
    .describe("Results for the tests that matter in this case; others are normal/consistent"),
  diagnosis: z.string(),
  differentials: z.array(z.string()),
  redFlagsToScreen: z.array(z.string()).describe("Red flags a competent GP should ask about in this case"),
  modelPlan: z.object({
    management: z.array(z.string()),
    prescribing: z.array(z.object({ drug: z.string(), dose: z.string(), duration: z.string() })),
    referral: z.string().describe("Decision and urgency, e.g. 'No referral' or '2WW to colorectal'"),
    safetyNetting: z.array(z.string()),
    followUp: z.string(),
  }),
  complicatingFactors: z.array(z.string()),
});
export type CaseFile = z.infer<typeof CaseFile>;
