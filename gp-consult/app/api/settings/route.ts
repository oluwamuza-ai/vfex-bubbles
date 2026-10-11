import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, saveSettings } from "@/lib/repo/settings";
import { jsonError } from "@/lib/api";

const Patch = z.object({ gpClock: z.boolean(), localPractice: z.boolean(), formulary: z.string().max(50_000) }).partial();

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(req: Request) {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid settings");
  return NextResponse.json(saveSettings(parsed.data));
}
