import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/repo/cards";
import { SPECIALTY_LABEL } from "@/lib/schemas/card";
import { CardEditor } from "@/components/CardEditor";
import { CardUpdates } from "@/components/CardUpdates";
import { pendingRevision } from "@/lib/repo/revisions";
import { diffCardBody } from "@/lib/cardDiff";
import { PageTitle, UnverifiedBanner, VerifiedBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const card = getCard((await params).id);
  if (!card) notFound();
  const rev = pendingRevision(card.id);
  const pending = rev
    ? { id: rev.id, summary: rev.summary, hasChanges: rev.hasChanges, proposedGuidelineDate: rev.proposedGuidelineDate, createdAt: rev.createdAt, diff: diffCardBody(card.body, rev.proposedBody) }
    : null;
  return (
    <div>
      <Link href="/cards" className="text-sm text-muted">← All cards</Link>
      <PageTitle
        title={card.name}
        subtitle={<>{SPECIALTY_LABEL[card.specialty]} · guideline date <strong>{card.guidelineDate}</strong></>}
        action={<VerifiedBadge verified={card.verified} />}
      />
      {!card.verified && <div className="mb-4"><UnverifiedBanner cardId={card.id} compact hideLink /></div>}
      <CardUpdates cardId={card.id} guidelineDate={card.guidelineDate} pending={pending} />
      <CardEditor key={`${card.id}-${card.verified}-${card.guidelineDate}-${hash(JSON.stringify(card.body))}`} card={card} />
    </div>
  );
}

/** Cheap content hash so the editor remounts when the card body changes (e.g. an approved update). */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
