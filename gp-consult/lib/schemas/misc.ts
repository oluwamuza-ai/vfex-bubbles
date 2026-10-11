import { z } from "zod";
import { CardBody } from "./card";

export const RapidFireBatch = z.object({
  items: z.array(
    z.object({
      conditionId: z.string(),
      vignette: z.string().describe("≤30 words, telegraphic clinical style: age/sex, key features, obs/results"),
      answer: z.enum(["urgent", "routine", "safetynet"]),
      rationale: z.string().describe("One sentence citing the threshold or criterion"),
      source: z.string().describe("Guideline name, e.g. 'NICE NG12'"),
    }),
  ),
});

export const CardUpdateProposal = z.object({
  hasChanges: z.boolean(),
  summary: z.string().describe("What changed in the guidance and why, with dates; or why no change is needed"),
  proposedGuidelineDate: z.string(),
  proposedBody: CardBody,
});
export type CardUpdateProposal = z.infer<typeof CardUpdateProposal>;
