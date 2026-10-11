// Elo-style rating. Each graded consultation is a "match" between you and the case,
// whose strength is set by its tier. Your result is the overall score mapped so that
// 60% (a solid pass) against an equally-rated case leaves the rating unchanged.

export const START_RATING = 900;
export const TIER_RATING: Record<number, number> = { 1: 800, 2: 1000, 3: 1200, 4: 1400, 5: 1600 };
/** Next case is pitched this far above the current rating. */
export const STRETCH = 100;

export function expected(player: number, opponent: number) {
  return 1 / (1 + 10 ** ((opponent - player) / 400));
}

/** Map a 0–100 consultation score to an Elo result in [0, 1]: 30→0, 60→0.5, 90→1. */
export function performance(score: number) {
  return Math.max(0, Math.min(1, (score - 30) / 60));
}

export function kFactor(attempts: number) {
  return attempts < 5 ? 40 : 24;
}

export function updateRating(rating: number, tier: number, score: number, k: number) {
  return rating + k * (performance(score) - expected(rating, TIER_RATING[tier]));
}

/** Tier whose case rating is closest to rating + STRETCH (ties go to the harder tier). */
export function tierFor(rating: number) {
  const target = rating + STRETCH;
  let best = 1;
  for (const t of [1, 2, 3, 4, 5]) {
    if (Math.abs(TIER_RATING[t] - target) <= Math.abs(TIER_RATING[best] - target)) best = t;
  }
  return best;
}
