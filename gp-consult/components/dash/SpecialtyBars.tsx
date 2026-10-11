import { SPECIALTY_LABEL, type Specialty } from "@/lib/schemas/card";
import { TIER_RATING } from "@/lib/engine/elo";

/** Horizontal bars of specialty Elo on a shared scale (tier 1 → tier 5 case ratings). */
export function SpecialtyBars({ rows }: { rows: { specialty: Specialty; rating: number; attempts: number }[] }) {
  const min = TIER_RATING[1] - 200;
  const max = TIER_RATING[5] + 100;
  const pct = (r: number) => Math.max(2, Math.min(100, ((r - min) / (max - min)) * 100));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.specialty} title={`${SPECIALTY_LABEL[r.specialty]}: rating ${Math.round(r.rating)} from ${r.attempts} consultation${r.attempts === 1 ? "" : "s"}`}>
          <div className="mb-1 flex text-sm">
            <span className="font-medium">{SPECIALTY_LABEL[r.specialty]}</span>
            <span className="ml-auto font-mono tabular-nums text-muted">{Math.round(r.rating)}</span>
          </div>
          <div className="relative h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct(r.rating)}%` }} />
            {[2, 3, 4, 5].map((t) => (
              <span key={t} className="absolute top-[-2px] h-3 w-px bg-line" style={{ left: `${pct(TIER_RATING[t])}%` }} />
            ))}
          </div>
        </div>
      ))}
      <div className="relative h-4 text-[10px] text-muted">
        {[1, 2, 3, 4, 5].map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(TIER_RATING[t])}%` }}>T{t}</span>
        ))}
      </div>
    </div>
  );
}
