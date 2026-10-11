import { NextResponse } from "next/server";
import { ConditionCard } from "@/lib/schemas/card";
import { getCard, saveCard } from "@/lib/repo/cards";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const card = getCard((await params).id);
  return card ? NextResponse.json(card) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCard(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = ConditionCard.safeParse({ ...(await req.json()), id });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  saveCard(parsed.data);
  return NextResponse.json(parsed.data);
}
