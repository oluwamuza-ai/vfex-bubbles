import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/db/client";
import type { CardUpdateProposal } from "@/lib/schemas/misc";
import { getCard, saveCard } from "./cards";

export function createRevision(cardId: string, p: CardUpdateProposal, citations: string[]) {
  const row = {
    id: randomUUID(),
    cardId,
    proposedBody: p.proposedBody,
    proposedGuidelineDate: p.proposedGuidelineDate,
    summary: citations.length ? `${p.summary}\n\nSources consulted:\n${citations.map((c) => `- ${c}`).join("\n")}` : p.summary,
    hasChanges: p.hasChanges,
    status: "pending" as const,
    createdAt: Date.now(),
  };
  const db = getDb();
  // Only one pending proposal per card: supersede older ones.
  db.update(schema.cardRevisions).set({ status: "rejected" }).where(and(eq(schema.cardRevisions.cardId, cardId), eq(schema.cardRevisions.status, "pending"))).run();
  db.insert(schema.cardRevisions).values(row).run();
  return row;
}

export function pendingRevision(cardId: string) {
  return getDb().select().from(schema.cardRevisions).where(and(eq(schema.cardRevisions.cardId, cardId), eq(schema.cardRevisions.status, "pending"))).orderBy(desc(schema.cardRevisions.createdAt)).get() ?? null;
}

/** Approve applies the proposal to the card (verification state is kept: you reviewed the diff). */
export function resolveRevision(id: string, action: "approve" | "reject") {
  const db = getDb();
  const rev = db.select().from(schema.cardRevisions).where(eq(schema.cardRevisions.id, id)).get();
  if (!rev || rev.status !== "pending") return null;
  if (action === "approve") {
    const card = getCard(rev.cardId);
    if (!card) return null;
    saveCard({ ...card, body: rev.proposedBody, guidelineDate: rev.proposedGuidelineDate });
  }
  db.update(schema.cardRevisions).set({ status: action === "approve" ? "approved" : "rejected" }).where(eq(schema.cardRevisions.id, id)).run();
  return rev;
}
