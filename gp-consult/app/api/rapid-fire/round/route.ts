import { NextResponse } from "next/server";
import { z } from "zod";
import { recordRound } from "@/lib/repo/rapidfire";
import { awardXp } from "@/lib/progress";
import { rapidFireXp } from "@/lib/engine/xp";
import { jsonError } from "@/lib/api";

const Body = z.object({ correct: z.number().int().min(0).max(200), answered: z.number().int().min(0).max(200) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || parsed.data.correct > parsed.data.answered) return jsonError("Bad round");
  recordRound(parsed.data.correct, parsed.data.answered);
  const xp = parsed.data.answered ? awardXp(rapidFireXp(parsed.data.correct), `Red-flag rapid-fire (${parsed.data.correct}/${parsed.data.answered})`) : 0;
  return NextResponse.json({ xp });
}
