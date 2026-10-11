export const TIMED_BONUS = 20;
export const DAILY_FIRST_BONUS = 25;

/** XP for a graded consultation: score scaled by tier, plus a bonus for finishing within the 10-minute clock. */
export function consultXp(score: number, tier: number, timed: boolean, durationMs: number) {
  const base = Math.round(score * (1 + (tier - 1) * 0.25));
  return base + (timed && durationMs <= 10 * 60 * 1000 ? TIMED_BONUS : 0);
}

export function rapidFireXp(correct: number) {
  return correct * 5;
}

/** YYYY-MM-DD in the configured timezone (APP_TIMEZONE, else server local). */
export function dayKey(t: number, timeZone = process.env.APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(t);
}

function prevDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Consecutive active days ending today (or yesterday, if today has no activity yet). */
export function streak(activeDays: Iterable<string>, today: string) {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : prevDay(today);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = prevDay(cursor);
  }
  return n;
}

export function level(totalXp: number) {
  // Level n needs 250·n·(n+1)/2 XP cumulatively: 250, 750, 1500, …
  let lvl = 1;
  while (totalXp >= (250 * lvl * (lvl + 1)) / 2) lvl++;
  const prev = (250 * (lvl - 1) * lvl) / 2;
  const next = (250 * lvl * (lvl + 1)) / 2;
  return { level: lvl, into: totalXp - prev, span: next - prev };
}
