import { desc, sum } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { START_RATING } from "@/lib/engine/elo";
import { dayKey, level, streak } from "@/lib/engine/xp";
import { SPECIALTIES } from "@/lib/schemas/card";

export function masteryRows() {
  return getDb().select().from(schema.mastery).all();
}

export function specialtyRatings(): Record<string, number> {
  const rows = getDb().select().from(schema.specialtyMastery).all();
  const out: Record<string, number> = Object.fromEntries(SPECIALTIES.map((s) => [s, START_RATING]));
  for (const r of rows) out[r.specialty] = r.rating;
  return out;
}

export function specialtyAttempts(): Record<string, number> {
  return Object.fromEntries(getDb().select().from(schema.specialtyMastery).all().map((r) => [r.specialty, r.attempts]));
}

export function xpSummary(now = Date.now()) {
  const db = getDb();
  const total = Number(db.select({ t: sum(schema.xpEvents.amount) }).from(schema.xpEvents).get()?.t ?? 0);
  const days = db.selectDistinct({ day: schema.xpEvents.day }).from(schema.xpEvents).all().map((r) => r.day);
  const today = dayKey(now);
  const todayXp = db.select({ amount: schema.xpEvents.amount, day: schema.xpEvents.day }).from(schema.xpEvents).orderBy(desc(schema.xpEvents.at)).limit(200).all().filter((r) => r.day === today).reduce((a, r) => a + r.amount, 0);
  return { total, streak: streak(days, today), activeToday: days.includes(today), todayXp, ...level(total) };
}
