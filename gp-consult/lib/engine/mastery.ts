/** 0 = unseen, 1–5 = mastery band from the condition's Elo rating. */
export function masteryLevel(rating: number | undefined) {
  if (rating == null) return 0;
  return rating < 900 ? 1 : rating < 1100 ? 2 : rating < 1300 ? 3 : rating < 1500 ? 4 : 5;
}
export const LEVEL_LABEL = ["Unseen", "Weak", "Developing", "Competent", "Strong", "Mastered"];
