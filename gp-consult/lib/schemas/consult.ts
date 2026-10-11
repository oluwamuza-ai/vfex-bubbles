import { z } from "zod";

export const ChatTurn = z.object({
  role: z.enum(["doctor", "patient"]),
  content: z.string(),
  at: z.number(),
});
export type ChatTurn = z.infer<typeof ChatTurn>;

export const ExamRecord = z.object({
  request: z.string(),
  findings: z.string(),
  at: z.number(),
});
export type ExamRecord = z.infer<typeof ExamRecord>;

export const InvestigationRecord = z.object({
  test: z.string(),
  kind: z.enum(["bedside", "lab", "imaging"]),
  result: z.string(),
  orderedAt: z.number(),
  availableAt: z.number(),
});
export type InvestigationRecord = z.infer<typeof InvestigationRecord>;

export const REFERRAL_OPTIONS = [
  "none",
  "routine",
  "urgent",
  "suspected cancer (2WW)",
  "same-day / acute",
  "emergency (999)",
] as const;

export const PlanSubmission = z.object({
  workingDiagnosis: z.string().min(1),
  differentials: z.array(z.string()),
  prescriptions: z.array(
    z.object({ drug: z.string(), dose: z.string(), frequency: z.string(), duration: z.string() }),
  ),
  nonDrug: z.string(),
  furtherInvestigations: z.string(),
  referral: z.enum(REFERRAL_OPTIONS),
  referralDetail: z.string(),
  safetyNetting: z.string(),
  followUp: z.string(),
});
export type PlanSubmission = z.infer<typeof PlanSubmission>;

/** Result returned to the client when examining. */
export const ExamFindingsOutput = z.object({
  findings: z.array(z.object({ examination: z.string(), finding: z.string() })),
});

export const InvestigationOutput = z.object({
  results: z.array(z.object({ test: z.string(), result: z.string() })),
});
