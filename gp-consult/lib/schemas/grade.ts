import { z } from "zod";

export const DOMAINS = [
  "history",
  "examination",
  "investigations",
  "diagnosis",
  "management",
  "referral",
  "safetyNetting",
  "communication",
] as const;
export const Domain = z.enum(DOMAINS);
export type Domain = z.infer<typeof Domain>;

export const DOMAIN_LABEL: Record<Domain, string> = {
  history: "History & red-flag screen",
  examination: "Examination",
  investigations: "Investigations",
  diagnosis: "Diagnosis & differentials",
  management: "Management vs guideline",
  referral: "Referral",
  safetyNetting: "Safety-netting & follow-up",
  communication: "Communication (ICE, explanation)",
};

/** Weights (sum 100) used to compute the overall score from domain scores. */
export const DOMAIN_WEIGHT: Record<Domain, number> = {
  history: 15,
  examination: 10,
  investigations: 10,
  diagnosis: 15,
  management: 20,
  referral: 10,
  safetyNetting: 10,
  communication: 10,
};

export const DomainGrade = z.object({
  domain: Domain,
  score: z.number().describe("0 to 10"),
  evidence: z.array(z.string()).describe("Direct quotes from the doctor's transcript, orders or plan"),
  missed: z.array(z.string()),
  guidelinePoints: z.array(
    z.object({
      point: z.string().describe("The specific guideline recommendation"),
      source: z.string().describe("Source URL from the ConditionCard"),
    }),
  ),
  comment: z.string(),
});
export type DomainGrade = z.infer<typeof DomainGrade>;

export const GradeResult = z.object({
  domains: z.array(DomainGrade),
  unnecessaryTests: z.array(z.string()),
  modelConsultation: z.string().describe("A concise model 10-minute consultation to compare against"),
  learningPoints: z.array(z.string()).describe("1 to 3 key learning points"),
  cardConcerns: z.array(z.string()).describe("Places where the ConditionCard itself may be outdated or wrong"),
  localPracticeNotes: z
    .array(z.string())
    .describe("Where EDLIZ/Zimbabwe practice or drug availability would change the plan; empty if local mode off"),
});
export type GradeResult = z.infer<typeof GradeResult>;

export type StoredGrade = GradeResult & {
  overallScore: number;
  formularyFlags: string[];
  cardVerified: boolean;
  graderModel: string;
};

export function computeOverall(domains: DomainGrade[]): number {
  let total = 0;
  let weight = 0;
  for (const d of domains) {
    const w = DOMAIN_WEIGHT[d.domain] ?? 0;
    total += (Math.max(0, Math.min(10, d.score)) / 10) * w;
    weight += w;
  }
  return weight ? Math.round((total / weight) * 100) : 0;
}
