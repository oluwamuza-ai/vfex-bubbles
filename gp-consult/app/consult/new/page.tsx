import { listCards } from "@/lib/repo/cards";
import { getSettings } from "@/lib/repo/settings";
import { PageTitle } from "@/components/ui";
import { NewConsultForm } from "@/components/consult/NewConsultForm";

export const dynamic = "force-dynamic";

export default function NewConsultPage() {
  const cards = listCards().map((c) => ({ id: c.id, name: c.name, specialty: c.specialty, verified: c.verified }));
  return (
    <div>
      <PageTitle title="New consultation" subtitle="Pick a condition and difficulty, or let the app choose." />
      <NewConsultForm cards={cards} timedDefault={getSettings().gpClock} />
    </div>
  );
}
