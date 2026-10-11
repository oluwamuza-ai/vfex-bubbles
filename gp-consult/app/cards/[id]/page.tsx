import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/repo/cards";
import { SPECIALTY_LABEL } from "@/lib/schemas/card";
import { CardEditor } from "@/components/CardEditor";
import { PageTitle, UnverifiedBanner, VerifiedBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const card = getCard((await params).id);
  if (!card) notFound();
  return (
    <div>
      <Link href="/cards" className="text-sm text-muted">← All cards</Link>
      <PageTitle
        title={card.name}
        subtitle={<>{SPECIALTY_LABEL[card.specialty]} · guideline date <strong>{card.guidelineDate}</strong></>}
        action={<VerifiedBadge verified={card.verified} />}
      />
      {!card.verified && <div className="mb-4"><UnverifiedBanner cardId={card.id} compact hideLink /></div>}
      <CardEditor key={`${card.id}-${card.verified}-${card.guidelineDate}`} card={card} />
    </div>
  );
}
