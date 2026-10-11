import Link from "next/link";
import { dashboardData } from "@/lib/repo/dashboard";
import { getSettings } from "@/lib/repo/settings";
import { Empty, ScorePill } from "@/components/ui";
import { XpCard } from "@/components/dash/XpCard";
import { SpecialtyBars } from "@/components/dash/SpecialtyBars";
import { ScoreStrip } from "@/components/dash/ScoreStrip";
import { MasteryMap } from "@/components/dash/MasteryMap";
import { StartButton } from "@/components/StartButton";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const d = dashboardData();
  const timed = getSettings().gpClock;
  return (
    <div className="space-y-4">
      <XpCard xp={d.xp} />

      <div className="card space-y-3">
        <div className="flex items-baseline">
          <h2 className="font-bold">Today</h2>
          <span className="ml-auto text-sm text-muted">{d.due ? `${d.due} condition${d.due === 1 ? "" : "s"} due for review` : "Nothing due — new conditions next"}</span>
        </div>
        <StartButton endpoint="/api/consult/next" to="/consult" body={{ timed }} label="Next patient for me" busyLabel="Generating patient…" className="btn-primary w-full py-3 text-base" />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/clinic" className="btn-ghost">Clinic (6 patients)</Link>
          <Link href="/rapid-fire" className="btn-ghost">Red-flag rapid-fire</Link>
        </div>
      </div>

      {d.unverified > 0 && (
        <Link href="/cards?v=unverified" className="block rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">
          <strong>{d.unverified} of {d.totalCards} condition cards unverified.</strong> Grading cites them, so review them when you can →
        </Link>
      )}

      <section className="card min-w-0">
        <h2 className="mb-3 font-bold">Recent scores</h2>
        {d.recent.length ? <ScoreStrip items={d.recent} /> : <Empty>Your scores will appear here after your first graded consultation.</Empty>}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="card min-w-0">
          <h2 className="mb-3 font-bold">Rating by specialty</h2>
          <SpecialtyBars rows={d.map} />
        </section>
        <section className="card min-w-0">
          <h2 className="mb-3 font-bold">Weakest conditions</h2>
          {d.weakest.length ? (
            <ul className="divide-y divide-line">
              {d.weakest.map((w) => (
                <li key={w.conditionId} className="flex items-center gap-2 py-2">
                  <Link href={`/consult/new?condition=${w.conditionId}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-accent">{w.name}</Link>
                  <span className="font-mono text-xs tabular-nums text-muted">{Math.round(w.rating)}</span>
                  <ScorePill score={w.lastScore} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing yet.</Empty>
          )}
        </section>
      </div>

      <section className="card min-w-0">
        <div className="mb-3 flex items-baseline">
          <h2 className="font-bold">Specialty map</h2>
          <Link href="/map" className="ml-auto text-sm font-semibold text-accent">Open map →</Link>
        </div>
        <MasteryMap map={d.map} compact />
      </section>

      <div className="text-center">
        <Link href="/history" className="text-sm font-semibold text-accent">Past consultations and feedback →</Link>
      </div>
    </div>
  );
}
