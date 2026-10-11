export function XpCard({ xp }: { xp: { total: number; level: number; into: number; span: number; streak: number; activeToday: boolean; todayXp: number } }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="text-center">
        <div className={`text-3xl font-black leading-none ${xp.streak ? "text-warn" : "text-muted"}`}>🔥{xp.streak}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">day streak</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline">
          <span className="font-bold">Level {xp.level}</span>
          <span className="ml-auto font-mono text-xs tabular-nums text-muted">{xp.total.toLocaleString()} XP</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-surface-2" role="progressbar" aria-valuenow={xp.into} aria-valuemax={xp.span} aria-label="Progress to next level">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(xp.into / xp.span) * 100}%` }} />
        </div>
        <div className="mt-1 text-xs text-muted">
          {xp.activeToday ? `+${xp.todayXp} XP today` : xp.streak ? "Do one consultation today to keep your streak" : "Start a streak today"} · {xp.span - xp.into} XP to level {xp.level + 1}
        </div>
      </div>
    </div>
  );
}
