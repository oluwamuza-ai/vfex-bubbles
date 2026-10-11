import { desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb, schema } from "@/db/client";
import { getCard, listCards } from "./cards";
import { startConsultation } from "./consultations";
import { cachedConditionIds } from "./cases";
import { masteryRows, specialtyRatings } from "./stats";
import { chooseNext } from "@/lib/engine/select";
import { SPECIALTIES } from "@/lib/schemas/card";
import { awardXp } from "@/lib/progress";

export const CLINIC_SIZE = 6;
export const CLINIC_BONUS_XP = 50;

/** Six mixed patients: one adaptive pick per specialty in rotation (weakest first), then any. */
export async function createClinic(timed: boolean) {
  const cards = listCards();
  const mastery = masteryRows();
  const ratings = specialtyRatings();
  const now = Date.now();
  const order = [...SPECIALTIES].sort((a, b) => ratings[a] - ratings[b]);
  const picks: { conditionId: string; tier: number }[] = [];
  for (let i = 0; picks.length < CLINIC_SIZE && i < CLINIC_SIZE * 3; i++) {
    const pick = chooseNext({
      cards,
      mastery,
      specialtyRatings: ratings,
      now,
      specialty: i < CLINIC_SIZE ? order[i % order.length] : undefined,
      exclude: picks.map((p) => p.conditionId),
      cachedIds: cachedConditionIds(),
    });
    if (pick) picks.push(pick);
  }
  const id = randomUUID();
  // Generate all patients in parallel so the waiting room fills quickly.
  const consultIds = await Promise.all(picks.map((p) => startConsultation(getCard(p.conditionId)!, p.tier, { timed, clinicSessionId: id })));
  getDb().insert(schema.clinicSessions).values({ id, consultationIds: consultIds, createdAt: now }).run();
  return id;
}

export function getClinic(id: string) {
  const db = getDb();
  const session = db.select().from(schema.clinicSessions).where(eq(schema.clinicSessions.id, id)).get();
  if (!session) return null;
  const rows = db.select().from(schema.consultations).where(inArray(schema.consultations.id, session.consultationIds)).all();
  const cases = db.select().from(schema.caseFiles).where(inArray(schema.caseFiles.id, rows.map((r) => r.caseId))).all();
  const patients = session.consultationIds.map((cid) => {
    const c = rows.find((r) => r.id === cid)!;
    const cf = cases.find((x) => x.id === c.caseId)!.data;
    return { consult: c, triage: cf.triageNote, name: cf.patient.name, age: cf.patient.age, sex: cf.patient.sex, diagnosis: c.status === "graded" ? cf.diagnosis : null };
  });
  return { session, patients };
}

/** Mark complete (once) when every patient is graded; awards the completion bonus. */
export function completeClinicIfDone(id: string) {
  const found = getClinic(id);
  if (!found || found.session.completedAt) return found;
  if (found.patients.every((p) => p.consult.status === "graded")) {
    getDb().update(schema.clinicSessions).set({ completedAt: Date.now() }).where(eq(schema.clinicSessions.id, id)).run();
    awardXp(CLINIC_BONUS_XP, "Clinic session completed");
    return getClinic(id);
  }
  return found;
}

export function listClinics(limit = 20) {
  return getDb().select().from(schema.clinicSessions).orderBy(desc(schema.clinicSessions.createdAt)).limit(limit).all();
}
