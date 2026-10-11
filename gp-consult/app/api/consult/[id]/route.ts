import { NextResponse } from "next/server";
import { getConsultationWithCase, publicView } from "@/lib/repo/consultations";
import { jsonError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = getConsultationWithCase((await params).id);
  if (!found) return jsonError("Not found", 404);
  return NextResponse.json(publicView(found.consult, found.caseFile));
}
