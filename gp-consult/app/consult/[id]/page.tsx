import { notFound, redirect } from "next/navigation";
import { getConsultationWithCase, publicView, updateConsultation } from "@/lib/repo/consultations";
import { ConsultRoom } from "@/components/consult/ConsultRoom";

export const dynamic = "force-dynamic";

export default async function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) notFound();
  if (found.consult.status !== "active") redirect(`/consult/${id}/feedback`);
  const c = found.consult;
  // Clinic patients are generated up front; their clock starts when they are first called in.
  if (c.clinicSessionId && !c.transcript.length && !c.exams.length && !c.investigations.length) {
    c.startedAt = Date.now();
    updateConsultation(id, { startedAt: c.startedAt });
  }
  return <ConsultRoom initial={publicView(found.consult, found.caseFile)} />;
}
