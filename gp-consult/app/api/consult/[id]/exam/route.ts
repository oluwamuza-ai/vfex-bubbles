import { NextResponse } from "next/server";
import { z } from "zod";
import { getConsultationWithCase, updateConsultation } from "@/lib/repo/consultations";
import { examine } from "@/lib/llm/services";
import { handleError, jsonError } from "@/lib/api";

const Body = z.object({ requests: z.array(z.string().trim().min(1).max(200)).min(1).max(8) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) return jsonError("Not found", 404);
  if (found.consult.status !== "active") return jsonError("Consultation already submitted", 409);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Choose at least one examination");
  try {
    const findings = await examine(found.caseFile, parsed.data.requests);
    const at = Date.now();
    const records = parsed.data.requests.map((r, i) => ({ request: r, findings: findings[i]?.finding ?? findings.find((f) => f.examination === r)?.finding ?? "No abnormality detected.", at }));
    const latest = getConsultationWithCase(id)!.consult; // re-read: chat may have saved meanwhile
    updateConsultation(id, { exams: [...latest.exams, ...records] });
    return NextResponse.json({ exams: records });
  } catch (e) {
    return handleError(e);
  }
}
