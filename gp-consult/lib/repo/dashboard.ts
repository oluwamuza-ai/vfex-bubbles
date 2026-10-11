import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { listCards } from "./cards";
import { masteryRows, specialtyRatings, specialtyAttempts, xpSummary } from "./stats";
import { SPECIALTIES, type Specialty } from "@/lib/schemas/card";
import { masteryLevel } from "@/lib/engine/mastery";

export function dashboardData(now = Date.now()) {
  const db = getDb();
  const cards = listCards();
  const mastery = new Map(masteryRows().map((m) => [m.conditionId, m]));
  const ratings = specialtyRatings();
  const attempts = specialtyAttempts();
  const recent = db
    .select({ id: schema.consultations.id, conditionId: schema.consultations.conditionId, score: schema.consultations.overallScore, tier: schema.consultations.tier, at: schema.consultations.gradedAt })
    .from(schema.consultations)
    .where(eq(schema.consultations.status, "graded"))
    .orderBy(desc(schema.consultations.gradedAt))
    .limit(14)
    .all()
    .reverse();
  const name = new Map(cards.map((c) => [c.id, c.name]));
  const weakest = [...mastery.values()]
    .sort((a, b) => a.rating - b.rating)
    .slice(0, 5)
    .map((m) => ({ ...m, name: name.get(m.conditionId) ?? m.conditionId }));
  const map = SPECIALTIES.map((s) => {
    const sc = cards.filter((c) => c.specialty === s);
    const conditions = sc.map((c) => ({ id: c.id, name: c.name, rating: mastery.get(c.id)?.rating, level: masteryLevel(mastery.get(c.id)?.rating), due: (mastery.get(c.id)?.dueAt ?? Infinity) <= now }));
    const filled = conditions.reduce((a, c) => a + c.level, 0);
    return { specialty: s as Specialty, rating: ratings[s], attempts: attempts[s] ?? 0, conditions, pct: sc.length ? Math.round((filled / (sc.length * 5)) * 100) : 0 };
  });
  const due = [...mastery.values()].filter((m) => m.dueAt <= now).length;
  const unverified = cards.filter((c) => !c.verified).length;
  const rf = db.select().from(schema.rapidFireRounds).orderBy(desc(schema.rapidFireRounds.at)).limit(1).get();
  return { xp: xpSummary(now), recent: recent.map((r) => ({ ...r, name: name.get(r.conditionId) ?? r.conditionId })), weakest, map, due, unverified, totalCards: cards.length, lastRapidFire: rf ?? null };
}
