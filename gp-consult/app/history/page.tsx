import Link from "next/link";
import { listConsultations } from "@/lib/repo/consultations";
import { listCards } from "@/lib/repo/cards";
import { Empty, PageTitle, ScorePill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const name = new Map(listCards().map((c) => [c.id, c.name]));
  const rows = listConsultations(200);
  return (
    <div>
      <PageTitle title="Consultation history" subtitle={`${rows.length} consultation${rows.length === 1 ? "" : "s"}`} />
      {rows.length === 0 ? (
        <Empty>No consultations yet.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const lp = r.grade?.learningPoints[0];
            return (
              <li key={r.id}>
                <Link href={r.status === "active" ? `/consult/${r.id}` : `/consult/${r.id}/feedback`} className="card flex items-start gap-3 py-3 hover:border-accent">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{name.get(r.conditionId) ?? r.conditionId}</div>
                    <div className="text-xs text-muted">
                      {new Date(r.startedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · tier {r.tier}
                      {r.clinicSessionId ? " · clinic" : ""}
                    </div>
                    {lp && <div className="mt-1 line-clamp-2 text-sm text-muted">{lp}</div>}
                  </div>
                  {r.status === "graded" ? <ScorePill score={r.overallScore} /> : <span className="chip">{r.status === "active" ? "in progress" : "ungraded"}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
