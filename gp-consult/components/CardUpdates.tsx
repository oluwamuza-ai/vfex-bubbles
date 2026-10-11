"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FieldDiff } from "@/lib/cardDiff";

type Pending = { id: string; summary: string; hasChanges: boolean; proposedGuidelineDate: string; createdAt: number; diff: FieldDiff[] } | null;

export function CardUpdates({ cardId, guidelineDate, pending }: { cardId: string; guidelineDate: string; pending: Pending }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const check = async () => {
    setBusy("Searching NICE, BNF and other guideline sources…");
    setError("");
    const res = await fetch(`/api/cards/${cardId}/updates`, { method: "POST" });
    setBusy("");
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Update check failed");
    router.refresh();
  };
  const resolve = async (action: "approve" | "reject") => {
    if (!pending) return;
    setBusy(action === "approve" ? "Applying…" : "Discarding…");
    const res = await fetch(`/api/revisions/${pending.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    setBusy("");
    if (!res.ok) return setError("Could not update");
    router.refresh();
  };

  return (
    <section className="card mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-bold">Guideline updates</div>
          <div className="text-sm text-muted">Card reflects guidance dated <strong className="text-ink">{guidelineDate}</strong>. Proposed changes need your approval.</div>
        </div>
        {!pending && <button className="btn-ghost" disabled={!!busy} onClick={check}>{busy || "Check for updates"}</button>}
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {pending && (
        <div className="space-y-3 rounded-xl border border-accent/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Proposed {new Date(pending.createdAt).toLocaleDateString("en-GB")} · {pending.hasChanges ? `new guideline date ${pending.proposedGuidelineDate}` : "no change needed"}
          </div>
          <p className="whitespace-pre-wrap text-sm">{pending.summary}</p>
          {pending.diff.length > 0 && (
            <div className="space-y-2">
              {pending.diff.map((d) => (
                <div key={d.label}>
                  <div className="label">{d.label}</div>
                  <ul className="space-y-1 text-sm">
                    {d.removed.map((r, i) => <li key={`r${i}`} className="rounded bg-danger-soft px-2 py-1 text-ink"><span className="mr-1 font-bold text-danger">−</span><span className="line-through decoration-danger/60">{r}</span></li>)}
                    {d.added.map((a, i) => <li key={`a${i}`} className="rounded bg-ok-soft px-2 py-1 text-ink"><span className="mr-1 font-bold text-ok">+</span>{a}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {pending.hasChanges && pending.diff.length > 0 ? (
              <>
                <button className="btn-primary" disabled={!!busy} onClick={() => resolve("approve")}>Approve &amp; apply</button>
                <button className="btn-ghost" disabled={!!busy} onClick={() => resolve("reject")}>Reject</button>
              </>
            ) : (
              <button className="btn-ghost" disabled={!!busy} onClick={() => resolve("reject")}>Dismiss</button>
            )}
            {busy && <span className="self-center text-sm text-muted">{busy}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
