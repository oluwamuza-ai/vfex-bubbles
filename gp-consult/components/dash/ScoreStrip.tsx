import Link from "next/link";

/** Column strip of recent consultation scores (oldest → newest) with a 60% pass line. */
export function ScoreStrip({ items }: { items: { id: string; name: string; score: number | null; tier: number }[] }) {
  return (
    <div>
      <div className="relative flex h-24 items-end gap-1 border-b border-line">
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted/50" style={{ bottom: "60%" }}>
          <span className="absolute -top-4 right-0 text-[10px] text-muted">60</span>
        </div>
        {items.map((i) => {
          const s = i.score ?? 0;
          const color = s >= 75 ? "bg-ok" : s >= 55 ? "bg-warn" : "bg-danger";
          return (
            <Link key={i.id} href={`/consult/${i.id}/feedback`} title={`${i.name} (tier ${i.tier}): ${s}%`} className="group flex h-full flex-1 items-end">
              <span className={`w-full rounded-t-[4px] ${color} opacity-85 group-hover:opacity-100`} style={{ height: `${Math.max(3, s)}%` }} />
            </Link>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>older</span><span>latest {items.at(-1)?.score ?? ""}%</span></div>
    </div>
  );
}
