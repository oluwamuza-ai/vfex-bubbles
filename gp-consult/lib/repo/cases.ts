import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/db/client";
import type { ConditionCard } from "@/lib/schemas/card";
import { generateCase } from "@/lib/llm/services";

/** Use a cached, unused case for this condition+tier, or generate (and cache) a fresh one. */
export async function obtainCase(card: ConditionCard, tier: number) {
  const db = getDb();
  const cached = db
    .select()
    .from(schema.caseFiles)
    .where(and(eq(schema.caseFiles.conditionId, card.id), eq(schema.caseFiles.tier, tier), isNull(schema.caseFiles.usedAt)))
    .get();
  if (cached) {
    markCaseUsed(cached.id); // claim synchronously so parallel starts can't share a case
    return cached;
  }
  const fresh = await createCase(card, tier);
  markCaseUsed(fresh.id);
  return fresh;
}

export async function createCase(card: ConditionCard, tier: number) {
  const db = getDb();
  const recent = db
    .select({ data: schema.caseFiles.data, tier: schema.caseFiles.tier })
    .from(schema.caseFiles)
    .where(eq(schema.caseFiles.conditionId, card.id))
    .orderBy(desc(schema.caseFiles.createdAt))
    .limit(6)
    .all()
    .map((r) => `${r.data.patient.name}, ${r.data.patient.age} ${r.data.patient.sex}, tier ${r.tier}: ${r.data.presentingComplaint}`);
  const { data, model } = await generateCase(card, tier, recent);
  const row = { id: randomUUID(), conditionId: card.id, tier, data, model, createdAt: Date.now(), usedAt: null };
  db.insert(schema.caseFiles).values(row).run();
  return row;
}

export function markCaseUsed(id: string) {
  getDb().update(schema.caseFiles).set({ usedAt: Date.now() }).where(eq(schema.caseFiles.id, id)).run();
}

export function getCase(id: string) {
  return getDb().select().from(schema.caseFiles).where(eq(schema.caseFiles.id, id)).get() ?? null;
}

/** Make sure an unused case exists for condition+tier (used to pre-generate the likely next case). */
export async function ensureCached(card: ConditionCard, tier: number) {
  const db = getDb();
  const cached = db
    .select({ id: schema.caseFiles.id })
    .from(schema.caseFiles)
    .where(and(eq(schema.caseFiles.conditionId, card.id), eq(schema.caseFiles.tier, tier), isNull(schema.caseFiles.usedAt)))
    .get();
  if (!cached) await createCase(card, tier);
}

export function cachedConditionIds(): string[] {
  return getDb().selectDistinct({ id: schema.caseFiles.conditionId }).from(schema.caseFiles).where(isNull(schema.caseFiles.usedAt)).all().map((r) => r.id);
}
