import { z } from "zod";

export const SPECIALTIES = [
  "medicine",
  "surgery",
  "obgyn",
  "paediatrics",
  "psychiatry",
] as const;
export const Specialty = z.enum(SPECIALTIES);
export type Specialty = z.infer<typeof Specialty>;

export const SPECIALTY_LABEL: Record<Specialty, string> = {
  medicine: "Medicine",
  surgery: "Surgery",
  obgyn: "O&G",
  paediatrics: "Paediatrics",
  psychiatry: "Psychiatry",
};

export const Threshold = z.object({
  label: z.string().describe("What the threshold or dose applies to"),
  value: z.string().describe("Exact value, dose or cut-off"),
});

export const SourceLink = z.object({
  title: z.string(),
  url: z.string(),
});

/** Editable clinical content of a ConditionCard (everything except identity/meta). */
export const CardBody = z.object({
  presentations: z.array(z.string()),
  redFlags: z.array(z.string()),
  keyHistory: z.array(z.string()),
  examination: z.array(z.string()),
  investigations: z.array(z.string()),
  firstLine: z.array(z.string()),
  secondLine: z.array(z.string()),
  referral: z.array(z.string()).describe("Referral criteria incl. NG12 suspected-cancer pathway where relevant"),
  safetyNetting: z.array(z.string()),
  thresholds: z.array(Threshold),
  sources: z.array(SourceLink),
});
export type CardBody = z.infer<typeof CardBody>;

export const ConditionCard = z.object({
  id: z.string(),
  name: z.string(),
  specialty: Specialty,
  tags: z.array(z.string()),
  guidelineDate: z.string().describe("Date of the guideline version the card reflects, YYYY-MM or YYYY-MM-DD"),
  verified: z.boolean(),
  body: CardBody,
});
export type ConditionCard = z.infer<typeof ConditionCard>;

export const CARD_LIST_FIELDS: { key: Exclude<keyof CardBody, "thresholds" | "sources">; label: string }[] = [
  { key: "presentations", label: "Presentations" },
  { key: "redFlags", label: "Red flags" },
  { key: "keyHistory", label: "Key history points" },
  { key: "examination", label: "Examination findings" },
  { key: "investigations", label: "Investigations" },
  { key: "firstLine", label: "First-line management" },
  { key: "secondLine", label: "Second-line / escalation" },
  { key: "referral", label: "Referral criteria" },
  { key: "safetyNetting", label: "Safety-netting" },
];
