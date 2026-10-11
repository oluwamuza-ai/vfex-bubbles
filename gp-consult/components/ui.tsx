import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">✓ Verified</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Unverified</span>
  );
}

export function UnverifiedBanner({ cardId, compact, hideLink }: { cardId: string; compact?: boolean; hideLink?: boolean }) {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">
      <strong>Unverified card.</strong> {compact ? "Not authoritative." : "This ConditionCard has not been reviewed — treat guideline points as provisional, not authoritative."}{" "}
      {!hideLink && <Link href={`/cards/${cardId}`} className="font-semibold underline">Review it</Link>}
    </div>
  );
}

export function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="chip">—</span>;
  const cls = score >= 75 ? "bg-ok-soft text-ok" : score >= 55 ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger";
  return <span className={`inline-flex min-w-11 justify-center rounded-full px-2 py-0.5 text-sm font-bold ${cls}`}>{score}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}
