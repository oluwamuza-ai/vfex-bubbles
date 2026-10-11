import { notFound, redirect } from "next/navigation";
import { getConsultationWithCase, publicView } from "@/lib/repo/consultations";
import { ConsultRoom } from "@/components/consult/ConsultRoom";

export const dynamic = "force-dynamic";

export default async function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) notFound();
  if (found.consult.status !== "active") redirect(`/consult/${id}/feedback`);
  return <ConsultRoom initial={publicView(found.consult, found.caseFile)} />;
}
