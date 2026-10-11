import { desc, max } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/db/client";

export function rapidFireItems(n = 40) {
  const all = getDb().select().from(schema.rapidFireItems).all();
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n);
}

export function addRapidFireItems(items: { conditionId: string; vignette: string; answer: "urgent" | "routine" | "safetynet"; rationale: string; source: string }[]) {
  const now = Date.now();
  for (const i of items) getDb().insert(schema.rapidFireItems).values({ id: randomUUID(), ...i, createdAt: now }).run();
  return items.length;
}

export function recordRound(correct: number, answered: number) {
  getDb().insert(schema.rapidFireRounds).values({ correct, answered, at: Date.now() }).run();
}

export function rapidFireStats() {
  const db = getDb();
  const best = db.select({ b: max(schema.rapidFireRounds.correct) }).from(schema.rapidFireRounds).get()?.b ?? 0;
  const recent = db.select().from(schema.rapidFireRounds).orderBy(desc(schema.rapidFireRounds.at)).limit(5).all();
  const bank = db.select({ id: schema.rapidFireItems.id }).from(schema.rapidFireItems).all().length;
  return { best, recent, bank };
}
