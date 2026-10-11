import { notFound, redirect } from "next/navigation";
import { getConsultationWithCase } from "@/lib/repo/consultations";
import { getCard } from "@/lib/repo/cards";
import { PageTitle } from "@/components/ui";
import { Feedback } from "@/components/feedback/Feedback";
import { GradeTrigger } from "@/components/feedback/GradeTrigger";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getConsultationWithCase(id);
  if (!found) notFound();
  const { consult, caseFile } = found;
  if (consult.status === "active") redirect(`/consult/${id}`);
  const card = getCard(consult.conditionId);
  const nextHref = consult.clinicSessionId ? `/clinic/${consult.clinicSessionId}` : "/consult/new";

  return (
    <div>
      <PageTitle title="Feedback" subtitle={`${caseFile.patient.name} · tier ${consult.tier}`} />
      {consult.status === "graded" && consult.grade && consult.plan ? (
        <Feedback
          grade={consult.grade}
          caseFile={caseFile}
          cardId={consult.conditionId}
          cardName={card?.name ?? consult.conditionId}
          transcript={consult.transcript}
          exams={consult.exams}
          investigations={consult.investigations}
          plan={consult.plan}
          ratingBefore={consult.ratingBefore}
          ratingAfter={consult.ratingAfter}
          xp={consult.xpAwarded}
          nextHref={nextHref}
        />
      ) : (
        <GradeTrigger id={id} />
      )}
    </div>
  );
}
