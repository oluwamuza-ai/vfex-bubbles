import { NextResponse } from "next/server";
import { z } from "zod";
import { getConsultationWithCase, publicView, updateConsultation } from "@/lib/repo/consultations";
import { runInvestigations } from "@/lib/llm/services";
import { classifyTest, TURNAROUND_MS } from "@/lib/investigations";
import { handleError, jsonError } from "@/lib/api";

const Body = z.object({ tests: z.array(z.string().trim().min(1).max(200)).min(1).max(15) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) return jsonError("Not found", 404);
  if (found.consult.status !== "active") return jsonError("Consultation already submitted", 409);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Choose at least one test");
  try {
    const results = await runInvestigations(found.caseFile, parsed.data.tests);
    const now = Date.now();
    const records = parsed.data.tests.map((t, i) => {
      const kind = classifyTest(t);
      return { test: t, kind, result: results[i]?.result ?? "Within normal limits.", orderedAt: now, availableAt: now + TURNAROUND_MS[kind] };
    });
    const latest = getConsultationWithCase(id)!;
    updateConsultation(id, { investigations: [...latest.consult.investigations, ...records] });
    return NextResponse.json(publicView(getConsultationWithCase(id)!.consult, found.caseFile).investigations);
  } catch (e) {
    return handleError(e);
  }
}
