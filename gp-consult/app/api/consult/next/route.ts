import { NextResponse } from "next/server";
import { z } from "zod";
import { listCards, getCard } from "@/lib/repo/cards";
import { startConsultation } from "@/lib/repo/consultations";
import { cachedConditionIds } from "@/lib/repo/cases";
import { getSettings } from "@/lib/repo/settings";
import { masteryRows, specialtyRatings } from "@/lib/repo/stats";
import { chooseNext } from "@/lib/engine/select";
import { handleError, jsonError } from "@/lib/api";

const Body = z.object({ specialty: z.string().optional(), timed: z.boolean().optional() });

/** Adaptive next case: spaced-repetition due list first, pitched just above your rating. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Bad request");
  const pick = chooseNext({
    cards: listCards(),
    mastery: masteryRows(),
    specialtyRatings: specialtyRatings(),
    cachedIds: cachedConditionIds(),
    now: Date.now(),
    specialty: parsed.data.specialty || undefined,
  });
  if (!pick) return jsonError("No condition cards for that specialty", 404);
  try {
    const id = await startConsultation(getCard(pick.conditionId)!, pick.tier, { timed: parsed.data.timed ?? getSettings().gpClock });
    return NextResponse.json({ id, ...pick });
  } catch (e) {
    return handleError(e);
  }
}
