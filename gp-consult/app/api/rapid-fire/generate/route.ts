import { NextResponse } from "next/server";
import { listCards } from "@/lib/repo/cards";
import { addRapidFireItems } from "@/lib/repo/rapidfire";
import { generateVignettes } from "@/lib/llm/extras";
import { handleError } from "@/lib/api";

export const maxDuration = 300;

/** Adds ~12 fresh vignettes drawn from 6 random condition cards. */
export async function POST() {
  const cards = listCards().sort(() => Math.random() - 0.5).slice(0, 6);
  try {
    const items = await generateVignettes(cards, 12);
    return NextResponse.json({ added: addRapidFireItems(items) });
  } catch (e) {
    return handleError(e);
  }
}
