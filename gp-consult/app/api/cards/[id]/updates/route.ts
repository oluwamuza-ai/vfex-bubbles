import { NextResponse } from "next/server";
import { getCard } from "@/lib/repo/cards";
import { createRevision } from "@/lib/repo/revisions";
import { proposeCardUpdate } from "@/lib/llm/extras";
import { handleError, jsonError } from "@/lib/api";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const card = getCard((await params).id);
  if (!card) return jsonError("Not found", 404);
  try {
    const { proposal, citations } = await proposeCardUpdate(card);
    return NextResponse.json(createRevision(card.id, proposal, citations));
  } catch (e) {
    return handleError(e);
  }
}
