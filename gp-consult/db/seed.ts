import { count } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { builtInCards, customCards } from "@/seed/cards";
import { seedVignettes } from "@/seed/rapidfire";
import type { SeedCard } from "@/seed/cards/types";

type DB = BetterSQLite3Database<typeof schema>;

/** Insert cards whose id doesn't exist yet. Never overwrites (protects your edits/verification). */
export function importCards(db: DB, cards: SeedCard[]): string[] {
  const existing = new Set(db.select({ id: schema.conditionCards.id }).from(schema.conditionCards).all().map((r) => r.id));
  const added: string[] = [];
  for (const c of cards) {
    if (existing.has(c.id)) continue;
    db.insert(schema.conditionCards)
      .values({
        id: c.id,
        name: c.name,
        specialty: c.specialty,
        tags: c.tags,
        body: c.body,
        guidelineDate: c.guidelineDate,
        verified: false,
        updatedAt: Date.now(),
      })
      .run();
    added.push(c.id);
  }
  return added;
}

export function seedIfEmpty(db: DB) {
  const [{ n }] = db.select({ n: count() }).from(schema.conditionCards).all();
  if (n === 0) importCards(db, [...builtInCards, ...customCards()]);

  const [{ m }] = db.select({ m: count() }).from(schema.rapidFireItems).all();
  if (m === 0) {
    const now = Date.now();
    for (const v of seedVignettes) {
      db.insert(schema.rapidFireItems).values({ ...v, createdAt: now }).onConflictDoNothing().run();
    }
  }
}
