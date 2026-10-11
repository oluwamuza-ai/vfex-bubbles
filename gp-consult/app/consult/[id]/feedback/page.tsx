import Link from "next/link";
import { notFound } from "next/navigation";
import { getConsultationWithCase } from "@/lib/repo/consultations";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const found = getConsultationWithCase((await params).id);
  if (!found) notFound();
  const { consult, caseFile } = found;
  return (
    <div className="space-y-3">
      <PageTitle title="Consultation submitted" subtitle={`${caseFile.patient.name} · ${caseFile.diagnosis}`} />
      <div className="card text-sm">Your plan: <strong>{consult.plan?.workingDiagnosis}</strong></div>
      <Link href="/consult/new" className="btn-primary">Next patient</Link>
    </div>
  );
}
