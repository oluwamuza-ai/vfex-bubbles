import "server-only";
import { getCard } from "@/lib/repo/cards";
import { getConsultationWithCase, updateConsultation } from "@/lib/repo/consultations";
import { formularyList, getSettings } from "@/lib/repo/settings";
import { gradeWithLlm } from "@/lib/llm/services";
import { flagOffFormulary } from "@/lib/formulary";
import { computeOverall, DOMAINS, type DomainGrade, type StoredGrade } from "@/lib/schemas/grade";
import { applyOutcome } from "@/lib/progress";

const inflight = new Map<string, Promise<StoredGrade>>();

/** Grade a submitted consultation (idempotent; concurrent calls share one grader request). */
export function gradeConsultation(id: string): Promise<StoredGrade> {
  const existing = inflight.get(id);
  if (existing) return existing;
  const p = run(id).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

async function run(id: string): Promise<StoredGrade> {
  const found = getConsultationWithCase(id);
  if (!found) throw new Error("Consultation not found");
  const { consult, caseFile } = found;
  if (consult.status === "graded" && consult.grade) return consult.grade;
  if (consult.status !== "submitted" || !consult.plan) throw new Error("Submit the plan before grading");
  const card = getCard(consult.conditionId);
  if (!card) throw new Error("Condition card missing");

  const settings = getSettings();
  const formulary = formularyList(settings);
  const flagged = settings.localPractice ? flagOffFormulary(consult.plan.prescriptions.map((p) => p.drug), formulary) : [];

  const { result, model } = await gradeWithLlm({
    card,
    caseFile,
    tier: consult.tier,
    transcript: consult.transcript,
    exams: consult.exams,
    investigations: consult.investigations,
    plan: consult.plan,
    startedAt: consult.startedAt,
    submittedAt: consult.submittedAt ?? Date.now(),
    timed: consult.timed,
    localPractice: { enabled: settings.localPractice, formulary, flagged },
  });

  // Exactly one entry per domain, in canonical order.
  const domains: DomainGrade[] = DOMAINS.map(
    (d) =>
      result.domains.find((x) => x.domain === d) ?? { domain: d, score: 0, evidence: [], missed: [], guidelinePoints: [], comment: "Not graded by the grader." },
  );
  const grade: StoredGrade = {
    ...result,
    domains,
    learningPoints: result.learningPoints.slice(0, 3),
    overallScore: computeOverall(domains),
    formularyFlags: flagged,
    cardVerified: card.verified,
    graderModel: model,
  };
  const now = Date.now();
  const outcome = applyOutcome({ conditionId: card.id, specialty: card.specialty, tier: consult.tier, score: grade.overallScore, timed: consult.timed, startedAt: consult.startedAt, submittedAt: consult.submittedAt ?? now });
  updateConsultation(id, {
    grade,
    overallScore: grade.overallScore,
    status: "graded",
    gradedAt: now,
    ratingBefore: outcome.ratingBefore,
    ratingAfter: outcome.ratingAfter,
    xpAwarded: outcome.xp,
  });
  return grade;
}
