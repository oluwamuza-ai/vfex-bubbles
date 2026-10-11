import Link from "next/link";
import type { CaseFile } from "@/lib/schemas/case";
import type { ChatTurn, ExamRecord, InvestigationRecord, PlanSubmission } from "@/lib/schemas/consult";
import { DOMAIN_LABEL, DOMAIN_WEIGHT, type StoredGrade } from "@/lib/schemas/grade";
import { UnverifiedBanner } from "@/components/ui";
import { ScoreRing } from "./ScoreRing";

export function Feedback({
  grade,
  caseFile,
  cardId,
  cardName,
  transcript,
  exams,
  investigations,
  plan,
  ratingBefore,
  ratingAfter,
  xp,
  nextHref,
}: {
  grade: StoredGrade;
  caseFile: CaseFile;
  cardId: string;
  cardName: string;
  transcript: ChatTurn[];
  exams: ExamRecord[];
  investigations: InvestigationRecord[];
  plan: PlanSubmission;
  ratingBefore: number | null;
  ratingAfter: number | null;
  xp: number | null;
  nextHref: string;
}) {
  const delta = ratingBefore != null && ratingAfter != null ? Math.round(ratingAfter - ratingBefore) : null;
  return (
    <div className="space-y-3">
      <div className="card flex items-center gap-4">
        <ScoreRing score={grade.overallScore} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Diagnosis</div>
          <div className="font-bold">{caseFile.diagnosis}</div>
          <div className="text-sm text-muted">You said: {plan.workingDiagnosis}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {delta != null && (
              <span className={`chip ${delta >= 0 ? "!text-ok" : "!text-danger"}`}>
                Rating {Math.round(ratingAfter!)} ({delta >= 0 ? "+" : ""}{delta})
              </span>
            )}
            {xp != null && xp > 0 && <span className="chip !text-accent">+{xp} XP</span>}
            <Link href={`/cards/${cardId}`} className="chip">{cardName} card</Link>
          </div>
        </div>
      </div>

      {!grade.cardVerified && <UnverifiedBanner cardId={cardId} />}

      {grade.learningPoints.length > 0 && (
        <section className="card border-accent/40 bg-accent-soft/40">
          <h2 className="mb-2 font-bold">Key learning points</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">
            {grade.learningPoints.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        </section>
      )}

      <div className="space-y-2">
        {grade.domains.map((d) => (
          <details key={d.domain} className="card group py-3" open={d.score < 6}>
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{DOMAIN_LABEL[d.domain]}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full rounded-full ${d.score >= 7 ? "bg-ok" : d.score >= 5 ? "bg-warn" : "bg-danger"}`} style={{ width: `${d.score * 10}%` }} />
                </div>
              </div>
              <div className="w-14 text-right font-mono text-sm font-bold tabular-nums">{d.score}/10</div>
              <span className="text-muted transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-3 space-y-2.5 text-sm">
              <p>{d.comment}</p>
              {d.evidence.length > 0 && (
                <div>
                  <div className="label">Evidence</div>
                  <ul className="space-y-1">
                    {d.evidence.map((e, i) => (
                      <li key={i} className="border-l-2 border-accent/50 pl-2 italic text-muted">“{e}”</li>
                    ))}
                  </ul>
                </div>
              )}
              {d.missed.length > 0 && (
                <div>
                  <div className="label !text-danger">Missed</div>
                  <ul className="list-disc space-y-0.5 pl-5">{d.missed.map((m, i) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {d.guidelinePoints.length > 0 && (
                <div>
                  <div className="label">Guideline</div>
                  <ul className="space-y-1">
                    {d.guidelinePoints.map((g, i) => (
                      <li key={i}>
                        {g.point}{" "}
                        {g.source && (
                          <a href={g.source} target="_blank" rel="noreferrer" className="whitespace-nowrap text-accent underline">source ↗</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-xs text-muted">Weight {DOMAIN_WEIGHT[d.domain]}%</div>
            </div>
          </details>
        ))}
      </div>

      {grade.unnecessaryTests.length > 0 && (
        <Callout tone="warn" title="Unnecessary tests">{grade.unnecessaryTests.join(", ")}</Callout>
      )}
      {grade.formularyFlags.length > 0 && (
        <Callout tone="warn" title="Not on your available formulary">{grade.formularyFlags.join(", ")}</Callout>
      )}
      {grade.localPracticeNotes.length > 0 && (
        <Callout tone="info" title="Local practice (EDLIZ / Zimbabwe)">
          <ul className="list-disc space-y-1 pl-5">{grade.localPracticeNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </Callout>
      )}
      {grade.cardConcerns.length > 0 && (
        <Callout tone="warn" title="Possible issues with the condition card">
          <ul className="list-disc space-y-1 pl-5">{grade.cardConcerns.map((n, i) => <li key={i}>{n}</li>)}</ul>
          <Link href={`/cards/${cardId}`} className="mt-1 inline-block font-semibold underline">Review card</Link>
        </Callout>
      )}

      <details className="card">
        <summary className="cursor-pointer font-bold">Model consultation</summary>
        <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{grade.modelConsultation}</div>
      </details>

      <details className="card">
        <summary className="cursor-pointer font-bold">Case file (revealed)</summary>
        <CaseReveal c={caseFile} />
      </details>

      <details className="card">
        <summary className="cursor-pointer font-bold">Your consultation</summary>
        <div className="mt-3 space-y-1.5 text-sm">
          {transcript.map((t, i) => (
            <p key={i}><strong className={t.role === "doctor" ? "text-accent" : ""}>{t.role === "doctor" ? "You" : "Patient"}:</strong> {t.content}</p>
          ))}
          {exams.length > 0 && <p className="pt-2"><strong>Examined:</strong> {exams.map((e) => e.request).join(", ")}</p>}
          {investigations.length > 0 && <p><strong>Ordered:</strong> {investigations.map((i) => i.test).join(", ")}</p>}
          <div className="pt-2">
            <strong>Plan:</strong> {plan.workingDiagnosis}
            {plan.prescriptions.map((p, i) => <div key={i}>℞ {p.drug} {p.dose} {p.frequency} {p.duration}</div>)}
            <div>Referral: {plan.referral}{plan.referralDetail ? ` — ${plan.referralDetail}` : ""}</div>
            {plan.safetyNetting && <div>Safety-net: {plan.safetyNetting}</div>}
            {plan.followUp && <div>Follow-up: {plan.followUp}</div>}
          </div>
        </div>
      </details>

      <p className="text-center text-xs text-muted">Graded by {grade.graderModel}</p>
      <Link href={nextHref} className="btn-primary w-full py-3 text-base">Next patient →</Link>
    </div>
  );
}

function Callout({ tone, title, children }: { tone: "warn" | "info"; title: string; children: React.ReactNode }) {
  const cls = tone === "warn" ? "border-warn/40 bg-warn-soft text-warn" : "border-accent/40 bg-accent-soft text-accent";
  return (
    <section className={`rounded-2xl border p-4 text-sm ${cls}`}>
      <h2 className="mb-1 font-bold">{title}</h2>
      <div className="text-ink">{children}</div>
    </section>
  );
}

function CaseReveal({ c }: { c: CaseFile }) {
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="grid gap-0.5 py-1.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
  const list = (xs: string[]) => (xs.length ? xs.join("; ") : "—");
  return (
    <dl className="mt-2 divide-y divide-line text-sm">
      <Row k="Patient" v={`${c.patient.name}, ${c.patient.age}, ${c.patient.sex}, ${c.patient.occupation}`} />
      <Row k="HPC" v={c.history.hpc} />
      <Row k="Only if asked" v={list(c.history.onlyIfAsked)} />
      <Row k="ICE" v={`Ideas: ${c.history.ideas} · Concerns: ${c.history.concerns} · Expectations: ${c.history.expectations}`} />
      {c.history.hiddenAgenda && <Row k="Hidden agenda" v={c.history.hiddenAgenda} />}
      <Row k="Red flags to screen" v={list(c.redFlagsToScreen)} />
      <Row k="PMH / DH" v={`${list(c.pmh)} · ${c.drugHistory.map((d) => `${d.drug} ${d.dose}`).join("; ") || "no regular meds"} · Allergies: ${list(c.allergies)}`} />
      <Row k="Obs" v={`HR ${c.observations.heartRate}, BP ${c.observations.bloodPressure}, RR ${c.observations.respiratoryRate}, SpO2 ${c.observations.spo2}, T ${c.observations.temperature} ${c.observations.other}`} />
      <Row k="Examination" v={c.examination.map((e) => `${e.system}: ${e.findings}`).join(" · ")} />
      <Row k="Investigations" v={c.investigations.map((i) => `${i.test}: ${i.result}`).join(" · ")} />
      <Row k="Differentials" v={list(c.differentials)} />
      <Row k="Model plan" v={<>{c.modelPlan.management.join("; ")}{c.modelPlan.prescribing.map((p, i) => <div key={i}>℞ {p.drug} {p.dose} {p.duration}</div>)}<div>Referral: {c.modelPlan.referral}</div><div>Safety-net: {list(c.modelPlan.safetyNetting)}</div><div>Follow-up: {c.modelPlan.followUp}</div></>} />
      {c.complicatingFactors.length > 0 && <Row k="Complicating" v={list(c.complicatingFactors)} />}
    </dl>
  );
}
