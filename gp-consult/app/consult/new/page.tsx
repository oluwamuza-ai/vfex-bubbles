import { listCards } from "@/lib/repo/cards";
import { getSettings } from "@/lib/repo/settings";
import { masteryRows } from "@/lib/repo/stats";
import { PageTitle } from "@/components/ui";
import { NewConsultForm } from "@/components/consult/NewConsultForm";

export const dynamic = "force-dynamic";

export default async function NewConsultPage({ searchParams }: { searchParams: Promise<{ condition?: string }> }) {
  const { condition } = await searchParams;
  const cards = listCards().map((c) => ({ id: c.id, name: c.name, specialty: c.specialty, verified: c.verified }));
  const now = Date.now();
  const due = masteryRows().filter((m) => m.dueAt <= now).length;
  return (
    <div>
      <PageTitle title="New consultation" subtitle="Let the app pick (adaptive), or choose a condition and tier." />
      <NewConsultForm cards={cards} timedDefault={getSettings().gpClock} dueCount={due} initialCondition={condition} />
    </div>
  );
}
