import Link from "next/link";
import { SPECIALTY_LABEL, type Specialty } from "@/lib/schemas/card";
import { LEVEL_LABEL } from "@/lib/engine/mastery";

type Cond = { id: string; name: string; rating?: number; level: number; due: boolean };
type Spec = { specialty: Specialty; pct: number; conditions: Cond[] };

// Text colour per step so labels stay legible on both light and dark tiles.
const INK = ["text-muted", "text-ink", "text-ink", "text-white", "text-white", "text-white"];
const INK_DARK = ["dark:text-muted", "dark:text-ink", "dark:text-white", "dark:text-white", "dark:text-[#062420]", "dark:text-[#062420]"];

export function MasteryMap({ map, compact }: { map: Spec[]; compact?: boolean }) {
  return (
    <div className="space-y-4">
      {map.map((s) => (
        <section key={s.specialty}>
          <div className="mb-1.5 flex items-baseline gap-2">
            <h3 className="text-sm font-bold">{SPECIALTY_LABEL[s.specialty]}</h3>
            <span className="text-xs text-muted">{s.pct}% filled</span>
          </div>
          <div className={`grid gap-1.5 ${compact ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3"}`}>
            {s.conditions.map((c) => (
              <Link
                key={c.id}
                href={`/consult/new?condition=${c.id}`}
                title={`${c.name} — ${LEVEL_LABEL[c.level]}${c.rating != null ? ` (rating ${Math.round(c.rating)})` : ""}${c.due ? " · due for review" : ""}`}
                className={`relative rounded-lg p-2 text-xs font-semibold leading-tight transition hover:ring-2 hover:ring-accent ${INK[c.level]} ${INK_DARK[c.level]} ${compact ? "h-10" : "min-h-14"}`}
                style={{ background: `var(--m${c.level})` }}
              >
                {!compact && <span className="line-clamp-2">{c.name}</span>}
                {!compact && <span className="mt-0.5 block text-[10px] font-medium opacity-80">{LEVEL_LABEL[c.level]}</span>}
                {c.due && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warn ring-2 ring-surface" aria-label="due" />}
              </Link>
            ))}
          </div>
        </section>
      ))}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted" aria-label="Legend">
        {LEVEL_LABEL.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-line" style={{ background: `var(--m${i})` }} />
            {l}
          </span>
        ))}
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warn" /> due</span>
      </div>
    </div>
  );
}
