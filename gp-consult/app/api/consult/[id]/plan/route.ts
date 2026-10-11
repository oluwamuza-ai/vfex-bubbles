import { NextResponse } from "next/server";
import { getConsultationWithCase, updateConsultation } from "@/lib/repo/consultations";
import { PlanSubmission } from "@/lib/schemas/consult";
import { jsonError } from "@/lib/api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) return jsonError("Not found", 404);
  if (found.consult.status !== "active") return jsonError("Already submitted", 409);
  const parsed = PlanSubmission.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("A working diagnosis is required");
  updateConsultation(id, { plan: parsed.data, status: "submitted", submittedAt: Date.now() });
  return NextResponse.json({ ok: true });
}
