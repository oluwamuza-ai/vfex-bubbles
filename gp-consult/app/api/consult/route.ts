import { NextResponse } from "next/server";
import { z } from "zod";
import { getCard } from "@/lib/repo/cards";
import { startConsultation } from "@/lib/repo/consultations";
import { getSettings } from "@/lib/repo/settings";
import { handleError, jsonError } from "@/lib/api";

const Body = z.object({
  conditionId: z.string(),
  tier: z.number().int().min(1).max(5),
  timed: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("conditionId and tier required");
  const card = getCard(parsed.data.conditionId);
  if (!card) return jsonError("Unknown condition", 404);
  try {
    const id = await startConsultation(card, parsed.data.tier, { timed: parsed.data.timed ?? getSettings().gpClock });
    return NextResponse.json({ id });
  } catch (e) {
    return handleError(e);
  }
}
