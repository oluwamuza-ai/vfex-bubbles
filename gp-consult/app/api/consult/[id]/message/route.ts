import { z } from "zod";
import { getConsultationWithCase, updateConsultation } from "@/lib/repo/consultations";
import { patientReply } from "@/lib/llm/services";
import { handleError, jsonError } from "@/lib/api";
import type { ChatTurn } from "@/lib/schemas/consult";

const Body = z.object({ content: z.string().trim().min(1).max(2000) });

// Streams the patient's reply as plain text; the transcript is saved once the reply completes.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) return jsonError("Not found", 404);
  if (found.consult.status !== "active") return jsonError("Consultation already submitted", 409);
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Message required");

  const transcript: ChatTurn[] = [...found.consult.transcript, { role: "doctor", content: parsed.data.content, at: Date.now() }];
  const gen = patientReply(found.caseFile, found.consult.tier, transcript);

  // Pull the first chunk before responding so API errors become proper JSON errors.
  let first: IteratorResult<string>;
  try {
    first = await gen.next();
  } catch (e) {
    return handleError(e);
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      try {
        if (!first.done) {
          reply += first.value;
          controller.enqueue(enc.encode(first.value));
        }
        for await (const chunk of gen) {
          reply += chunk;
          controller.enqueue(enc.encode(chunk));
        }
      } catch (e) {
        console.error(e);
        const msg = "\n[connection to the patient model was interrupted — please resend]";
        controller.enqueue(enc.encode(msg));
      } finally {
        if (reply.trim()) {
          updateConsultation(id, { transcript: [...transcript, { role: "patient", content: reply.trim(), at: Date.now() }] });
        }
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
