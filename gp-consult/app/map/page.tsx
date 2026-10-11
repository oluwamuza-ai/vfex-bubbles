import { dashboardData } from "@/lib/repo/dashboard";
import { PageTitle } from "@/components/ui";
import { MasteryMap } from "@/components/dash/MasteryMap";

export const dynamic = "force-dynamic";

export default function MapPage() {
  const d = dashboardData();
  const overall = Math.round(d.map.reduce((a, s) => a + s.pct, 0) / d.map.length);
  return (
    <div>
      <PageTitle title="Specialty map" subtitle={`${overall}% filled overall. Tiles darken as your rating for each condition rises; tap one to practise it.`} />
      <MasteryMap map={d.map} />
    </div>
  );
}
