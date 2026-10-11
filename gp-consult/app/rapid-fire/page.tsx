import { rapidFireStats } from "@/lib/repo/rapidfire";
import { PageTitle } from "@/components/ui";
import { RapidFire } from "@/components/RapidFire";

export const dynamic = "force-dynamic";

export default function RapidFirePage() {
  const s = rapidFireStats();
  return (
    <div>
      <PageTitle title="Red-flag rapid-fire" />
      <RapidFire best={s.best} bank={s.bank} />
    </div>
  );
}
