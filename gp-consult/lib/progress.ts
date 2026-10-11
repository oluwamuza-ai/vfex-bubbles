import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { kFactor, START_RATING, updateRating } from "@/lib/engine/elo";
import { schedule } from "@/lib/engine/srs";
import { consultXp, DAILY_FIRST_BONUS, dayKey } from "@/lib/engine/xp";

export function awardXp(amount: number, reason: string, now = Date.now()) {
  if (amount <= 0) return 0;
  const db = getDb();
  const day = dayKey(now);
  const firstToday = !db.select({ id: schema.xpEvents.id }).from(schema.xpEvents).where(eq(schema.xpEvents.day, day)).get();
  db.insert(schema.xpEvents).values({ amount, reason, day, at: now }).run();
  if (firstToday) db.insert(schema.xpEvents).values({ amount: DAILY_FIRST_BONUS, reason: "First session today", day, at: now }).run();
  return amount + (firstToday ? DAILY_FIRST_BONUS : 0);
}

/** Update Elo (condition + specialty), spaced-repetition schedule and XP after a graded consultation. */
export function applyOutcome(o: { conditionId: string; specialty: string; tier: number; score: number; timed: boolean; startedAt: number; submittedAt: number }) {
  const db = getDb();
  const now = Date.now();
  return db.transaction(() => {
    const spec = db.select().from(schema.specialtyMastery).where(eq(schema.specialtyMastery.specialty, o.specialty)).get();
    const specRating = spec?.rating ?? START_RATING;
    const m = db.select().from(schema.mastery).where(eq(schema.mastery.conditionId, o.conditionId)).get();
    const before = m?.rating ?? specRating;
    const attempts = m?.attempts ?? 0;
    const after = updateRating(before, o.tier, o.score, kFactor(attempts));
    const s = schedule({ reps: m?.reps ?? 0, ease: m?.ease ?? 2.5, intervalDays: m?.intervalDays ?? 0 }, o.score, now);
    const row = { rating: after, attempts: attempts + 1, reps: s.reps, ease: s.ease, intervalDays: s.intervalDays, dueAt: s.dueAt, lastScore: o.score, lastSeenAt: now };
    db.insert(schema.mastery).values({ conditionId: o.conditionId, ...row }).onConflictDoUpdate({ target: schema.mastery.conditionId, set: row }).run();

    const specAfter = updateRating(specRating, o.tier, o.score, 16);
    db.insert(schema.specialtyMastery)
      .values({ specialty: o.specialty, rating: specAfter, attempts: 1 })
      .onConflictDoUpdate({ target: schema.specialtyMastery.specialty, set: { rating: specAfter, attempts: (spec?.attempts ?? 0) + 1 } })
      .run();

    const xp = awardXp(consultXp(o.score, o.tier, o.timed, o.submittedAt - o.startedAt), `Consultation (tier ${o.tier}, ${o.score}%)`, now);
    return { ratingBefore: before, ratingAfter: after, xp };
  });
}
