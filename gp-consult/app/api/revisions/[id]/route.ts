import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveRevision } from "@/lib/repo/revisions";
import { jsonError } from "@/lib/api";

const Body = z.object({ action: z.enum(["approve", "reject"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("action must be approve or reject");
  const rev = resolveRevision((await params).id, parsed.data.action);
  return rev ? NextResponse.json({ ok: true }) : jsonError("Revision not found or already resolved", 404);
}
