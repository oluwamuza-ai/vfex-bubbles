import { START_RATING, tierFor } from "./elo";

export type MasteryLite = { conditionId: string; rating: number; dueAt: number; attempts: number };
export type CardLite = { id: string; specialty: string };

/**
 * Choose the next condition + tier:
 * 1) conditions due for review (most overdue first, weakest breaks ties);
 * 2) otherwise an unseen condition, from your weakest specialty;
 * 3) otherwise the weakest-rated condition.
 */
export function chooseNext(opts: {
  cards: CardLite[];
  mastery: MasteryLite[];
  specialtyRatings: Record<string, number>;
  now: number;
  specialty?: string;
  exclude?: string[];
  /** Conditions that already have a pre-generated case waiting; preferred among unseen ones. */
  cachedIds?: string[];
}) {
  const exclude = new Set(opts.exclude ?? []);
  const cards = opts.cards.filter((c) => (!opts.specialty || c.specialty === opts.specialty) && !exclude.has(c.id));
  if (!cards.length) return null;
  const m = new Map(opts.mastery.map((x) => [x.conditionId, x]));
  const specRating = (s: string) => opts.specialtyRatings[s] ?? START_RATING;
  const ratingOf = (c: CardLite) => m.get(c.id)?.rating ?? specRating(c.specialty);

  const due = cards.filter((c) => m.has(c.id) && m.get(c.id)!.dueAt <= opts.now);
  let pick: CardLite | undefined;
  if (due.length) {
    pick = due.sort((a, b) => m.get(a.id)!.dueAt - m.get(b.id)!.dueAt || ratingOf(a) - ratingOf(b))[0];
  } else {
    const unseen = cards.filter((c) => !m.has(c.id));
    if (unseen.length) {
      const minSpec = Math.min(...unseen.map((c) => specRating(c.specialty)));
      const pool = unseen.filter((c) => specRating(c.specialty) === minSpec);
      const cached = new Set(opts.cachedIds ?? []);
      const warm = pool.filter((c) => cached.has(c.id));
      const from = warm.length ? warm : pool;
      pick = from[Math.floor(Math.random() * from.length)];
    } else {
      pick = [...cards].sort((a, b) => ratingOf(a) - ratingOf(b))[0];
    }
  }
  return { conditionId: pick.id, tier: tierFor(ratingOf(pick)), reason: due.length ? "due" : m.has(pick.id) ? "weakest" : "new" };
}
