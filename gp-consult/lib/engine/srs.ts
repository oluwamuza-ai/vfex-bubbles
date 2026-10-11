// SM-2-style spacing keyed off the consultation score. Weak conditions come back
// tomorrow; mastered ones space out (3 days, a week, then interval × ease).

export const DAY_MS = 24 * 60 * 60 * 1000;

export type SrsState = { reps: number; ease: number; intervalDays: number };

export function quality(score: number) {
  return score >= 85 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 45 ? 2 : score >= 30 ? 1 : 0;
}

export function schedule(prev: SrsState, score: number, now: number): SrsState & { dueAt: number } {
  const q = quality(score);
  const ease = Math.max(1.3, prev.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  let reps: number;
  let intervalDays: number;
  if (q < 3) {
    reps = 0;
    intervalDays = 1;
  } else {
    reps = prev.reps + 1;
    intervalDays = reps === 1 ? 3 : reps === 2 ? 7 : Math.round(prev.intervalDays * ease);
  }
  return { reps, ease, intervalDays, dueAt: now + intervalDays * DAY_MS };
}
