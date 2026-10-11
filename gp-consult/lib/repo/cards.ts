import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { ConditionCard } from "@/lib/schemas/card";

export function rowToCard(r: typeof schema.conditionCards.$inferSelect): ConditionCard {
  return {
    id: r.id,
    name: r.name,
    specialty: r.specialty as ConditionCard["specialty"],
    tags: r.tags,
    guidelineDate: r.guidelineDate,
    verified: r.verified,
    body: r.body,
  };
}

export function listCards(): ConditionCard[] {
  return getDb().select().from(schema.conditionCards).orderBy(schema.conditionCards.specialty, schema.conditionCards.name).all().map(rowToCard);
}

export function getCard(id: string): ConditionCard | null {
  const r = getDb().select().from(schema.conditionCards).where(eq(schema.conditionCards.id, id)).get();
  return r ? rowToCard(r) : null;
}

export function saveCard(card: ConditionCard) {
  const db = getDb();
  const values = {
    name: card.name,
    specialty: card.specialty,
    tags: card.tags,
    body: card.body,
    guidelineDate: card.guidelineDate,
    verified: card.verified,
    updatedAt: Date.now(),
  };
  db.insert(schema.conditionCards)
    .values({ id: card.id, ...values })
    .onConflictDoUpdate({ target: schema.conditionCards.id, set: values })
    .run();
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
