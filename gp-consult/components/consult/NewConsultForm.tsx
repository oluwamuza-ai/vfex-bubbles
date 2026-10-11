"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SPECIALTIES, SPECIALTY_LABEL, type Specialty } from "@/lib/schemas/card";
import { TIER_DESCRIPTION } from "@/lib/schemas/case";

type CardLite = { id: string; name: string; specialty: Specialty; verified: boolean };

export function NewConsultForm({ cards, timedDefault, dueCount, initialCondition }: { cards: CardLite[]; timedDefault: boolean; dueCount: number; initialCondition?: string }) {
  const router = useRouter();
  const [conditionId, setConditionId] = useState(initialCondition && cards.some((c) => c.id === initialCondition) ? initialCondition : cards[0]?.id ?? "");
  const [specialty, setSpecialty] = useState("");
  const [tier, setTier] = useState(1);
  const [timed, setTimed] = useState(timedDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async (adaptive: boolean) => {
    setBusy(true);
    setError("");
    const res = await fetch(adaptive ? "/api/consult/next" : "/api/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(adaptive ? { specialty: specialty || undefined, timed } : { conditionId, tier, timed }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(body.error || "Could not start");
    }
    router.push(`/consult/${body.id}`);
  };

  return (
    <div className="space-y-3">
      <div className="card space-y-3 border-accent/40">
        <div>
          <div className="font-bold">Adaptive</div>
          <p className="text-sm text-muted">
            Picks {dueCount > 0 ? <><strong className="text-ink">{dueCount} condition{dueCount === 1 ? "" : "s"} due for review</strong> first</> : "new or weak conditions"}, pitched just above your current rating.
          </p>
        </div>
        <select className="input" aria-label="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">Any specialty</option>
          {SPECIALTIES.map((s) => <option key={s} value={s}>{SPECIALTY_LABEL[s]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          10-minute GP clock
        </label>
        <button className="btn-primary w-full py-3 text-base" disabled={busy} onClick={() => start(true)}>
          {busy ? "Generating patient…" : "Next patient for me"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line" />or choose<span className="h-px flex-1 bg-line" /></div>

      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="cond">Condition</label>
          <select id="cond" className="input" value={conditionId} onChange={(e) => setConditionId(e.target.value)}>
            {SPECIALTIES.map((s) => (
              <optgroup key={s} label={SPECIALTY_LABEL[s]}>
                {cards.filter((c) => c.specialty === s).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.verified ? "" : " (unverified card)"}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <span className="label">Tier</span>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`rounded-lg border py-2 font-bold ${tier === t ? "border-accent bg-accent-soft text-accent" : "border-line"}`}>{t}</button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">{TIER_DESCRIPTION[tier]}</p>
        </div>
        <button className="btn-ghost w-full" disabled={busy || !conditionId} onClick={() => start(false)}>
          {busy ? "Generating patient…" : "Call patient in"}
        </button>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
