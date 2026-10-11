import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/db/client";
import type { ConditionCard } from "@/lib/schemas/card";
import { getCase, obtainCase } from "./cases";

export type ConsultationRow = typeof schema.consultations.$inferSelect;

export async function startConsultation(card: ConditionCard, tier: number, opts: { timed: boolean; clinicSessionId?: string }) {
  const c = await obtainCase(card, tier);
  const row = {
    id: randomUUID(),
    caseId: c.id,
    conditionId: card.id,
    specialty: card.specialty,
    tier,
    clinicSessionId: opts.clinicSessionId ?? null,
    status: "active" as const,
    timed: opts.timed,
    transcript: [],
    exams: [],
    investigations: [],
    startedAt: Date.now(),
  };
  getDb().insert(schema.consultations).values(row).run();
  return row.id;
}

export function getConsultation(id: string): ConsultationRow | null {
  return getDb().select().from(schema.consultations).where(eq(schema.consultations.id, id)).get() ?? null;
}

export function getConsultationWithCase(id: string) {
  const consult = getConsultation(id);
  if (!consult) return null;
  const c = getCase(consult.caseId);
  if (!c) return null;
  return { consult, caseFile: c.data };
}

export function updateConsultation(id: string, patch: Partial<ConsultationRow>) {
  getDb().update(schema.consultations).set(patch).where(eq(schema.consultations.id, id)).run();
}

export function listConsultations(limit = 50) {
  return getDb().select().from(schema.consultations).orderBy(desc(schema.consultations.startedAt)).limit(limit).all();
}

/** What the browser is allowed to see while the consultation is active (no CaseFile). */
export function publicView(consult: ConsultationRow, caseFile: { triageNote: string; patient: { name: string; age: string; sex: string } }, now = Date.now()) {
  return {
    id: consult.id,
    status: consult.status,
    tier: consult.tier,
    timed: consult.timed,
    startedAt: consult.startedAt,
    clinicSessionId: consult.clinicSessionId,
    triage: { note: caseFile.triageNote, name: caseFile.patient.name, age: caseFile.patient.age, sex: caseFile.patient.sex },
    transcript: consult.transcript,
    exams: consult.exams,
    investigations: consult.investigations.map((i) => ({
      test: i.test,
      kind: i.kind,
      orderedAt: i.orderedAt,
      availableAt: i.availableAt,
      result: now >= i.availableAt || consult.status !== "active" ? i.result : null,
    })),
    plan: consult.plan,
  };
}
export type PublicConsultation = ReturnType<typeof publicView>;
