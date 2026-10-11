import Link from "next/link";
import { notFound } from "next/navigation";
import { completeClinicIfDone, CLINIC_BONUS_XP } from "@/lib/repo/clinic";
import { getCard } from "@/lib/repo/cards";
import { SPECIALTY_LABEL, type Specialty } from "@/lib/schemas/card";
import { PageTitle, ScorePill } from "@/components/ui";
import { ScoreRing } from "@/components/feedback/ScoreRing";
import { StartButton } from "@/components/StartButton";

export const dynamic = "force-dynamic";

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const found = completeClinicIfDone((await params).id);
  if (!found) notFound();
  const { session, patients } = found;
  const graded = patients.filter((p) => p.consult.status === "graded");
  const done = !!session.completedAt;
  const avg = graded.length ? Math.round(graded.reduce((a, p) => a + (p.consult.overallScore ?? 0), 0) / graded.length) : 0;
  const xp = graded.reduce((a, p) => a + (p.consult.xpAwarded ?? 0), 0) + (done ? CLINIC_BONUS_XP : 0);
  const next = patients.find((p) => p.consult.status !== "graded");

  return (
    <div className="space-y-4">
      <PageTitle title={done ? "Clinic summary" : "Clinic list"} subtitle={`${graded.length} of ${patients.length} seen`} />

      {done && (
        <div className="card space-y-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={avg} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Session average</div>
              <div className="text-lg font-bold">{avg >= 75 ? "Excellent clinic" : avg >= 60 ? "Solid clinic" : "Tough clinic — review the feedback"}</div>
              <div className="chip mt-1 !text-accent">+{xp} XP this session</div>
            </div>
          </div>
          <div>
            <div className="label">Key learning points from this clinic</div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {graded.flatMap((p) => (p.consult.grade?.learningPoints ?? []).slice(0, 1).map((l, i) => <li key={`${p.consult.id}-${i}`}>{l}</li>))}
            </ul>
          </div>
        </div>
      )}

      {!done && next && (
        <Link href={next.consult.status === "active" ? `/consult/${next.consult.id}` : `/consult/${next.consult.id}/feedback`} className="btn-primary w-full py-3 text-base">
          {next.consult.status === "active" ? `Call in ${next.name}` : `Finish ${next.name}`} →
        </Link>
      )}

      <ol className="space-y-2">
        {patients.map((p, i) => {
          const card = getCard(p.consult.conditionId);
          const href = p.consult.status === "active" ? `/consult/${p.consult.id}` : `/consult/${p.consult.id}/feedback`;
          return (
            <li key={p.consult.id}>
              <Link href={href} className="card flex items-center gap-3 py-3 hover:border-accent">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.name}, {p.age}{/^\d+$/.test(p.age) ? "y" : ""} {p.sex === "female" ? "F" : "M"}</div>
                  <div className="truncate text-sm text-muted">{p.triage}</div>
                  {p.diagnosis && (
                    <div className="text-xs text-muted">
                      {p.diagnosis} · {card ? SPECIALTY_LABEL[card.specialty as Specialty] : ""} · tier {p.consult.tier}
                    </div>
                  )}
                </div>
                {p.consult.status === "graded" ? <ScorePill score={p.consult.overallScore} /> : <span className="chip">{p.consult.status === "submitted" ? "grading" : "waiting"}</span>}
              </Link>
            </li>
          );
        })}
      </ol>

      {done && <StartButton endpoint="/api/clinic" to="/clinic" label="Start another clinic" busyLabel="Filling the waiting room…" className="btn-ghost w-full" />}
    </div>
  );
}
