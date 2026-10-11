"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SPECIALTIES, SPECIALTY_LABEL, type Specialty } from "@/lib/schemas/card";
import { TIER_DESCRIPTION } from "@/lib/schemas/case";

type CardLite = { id: string; name: string; specialty: Specialty; verified: boolean };

export function NewConsultForm({ cards, timedDefault }: { cards: CardLite[]; timedDefault: boolean }) {
  const router = useRouter();
  const [conditionId, setConditionId] = useState(cards[0]?.id ?? "");
  const [tier, setTier] = useState(1);
  const [timed, setTimed] = useState(timedDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conditionId, tier, timed }),
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          10-minute GP clock
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full py-3 text-base" disabled={busy || !conditionId} onClick={start}>
        {busy ? "Generating patient…" : "Call patient in"}
      </button>
    </div>
  );
}
