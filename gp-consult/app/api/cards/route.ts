import { NextResponse } from "next/server";
import { ConditionCard } from "@/lib/schemas/card";
import { getCard, listCards, saveCard, slugify } from "@/lib/repo/cards";

export async function GET() {
  return NextResponse.json(listCards());
}

export async function POST(req: Request) {
  const raw = await req.json();
  const parsed = ConditionCard.safeParse({ ...raw, id: raw.id || slugify(raw.name || ""), verified: false });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  if (!parsed.data.id) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (getCard(parsed.data.id)) return NextResponse.json({ error: "A card with this id already exists" }, { status: 409 });
  saveCard(parsed.data);
  return NextResponse.json(parsed.data);
}
