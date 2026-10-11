import "server-only";

// Phase 4 replaces this with Elo + spaced repetition + XP.
export function applyOutcome(_o: { conditionId: string; specialty: string; tier: number; score: number; timed: boolean; startedAt: number; submittedAt: number }) {
  return { ratingBefore: null as number | null, ratingAfter: null as number | null, xp: 0 };
}
