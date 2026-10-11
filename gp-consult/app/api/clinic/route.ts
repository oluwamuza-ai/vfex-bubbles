import { NextResponse } from "next/server";
import { createClinic } from "@/lib/repo/clinic";
import { getSettings } from "@/lib/repo/settings";
import { handleError } from "@/lib/api";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { timed } = (await req.json().catch(() => ({}))) as { timed?: boolean };
  try {
    return NextResponse.json({ id: await createClinic(timed ?? getSettings().gpClock) });
  } catch (e) {
    return handleError(e);
  }
}
