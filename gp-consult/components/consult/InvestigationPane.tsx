"use client";

import { useEffect, useState } from "react";
import type { PublicConsultation } from "@/lib/repo/consultations";
import { QUICK_TESTS } from "@/lib/investigations";
import { ChipPicker } from "./ChipPicker";

type Inv = PublicConsultation["investigations"][number];

export function InvestigationPane({
  id,
  investigations,
  onInvestigations,
  onError,
}: {
  id: string;
  investigations: Inv[];
  onInvestigations: (i: Inv[]) => void;
  onError: (e: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!investigations.some((i) => i.result == null)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [investigations]);

  const ordered = new Set(investigations.map((i) => i.test.toLowerCase()));

  const submit = async (tests: string[]) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/consult/${id}/investigate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tests }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Ordering failed");
      onInvestigations(body);
      return true;
    } catch (e) {
      onError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ChipPicker
        options={QUICK_TESTS}
        placeholder="Other test, e.g. ‘FIT’, ‘serum urate’, ‘ESR’"
        actionLabel="Order"
        busyLabel="Ordering…"
        busy={busy}
        disabled={(o) => ordered.has(o.toLowerCase())}
        onSubmit={submit}
      />
      <p className="text-xs text-muted">Bedside tests (urine dip, ECG, glucose, obs, peak flow, UPT) return immediately; bloods and imaging come back as “results back” shortly. Every order is graded — unnecessary tests are penalised.</p>
      <div className="space-y-2">
        {[...investigations].reverse().map((i, idx) => (
          <div key={idx} className="card py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{i.test}</span>
              <span className="chip ml-auto">{i.kind}</span>
            </div>
            {i.result == null ? (
              <div className="mt-1 animate-pulse text-sm text-warn">Awaiting results · ~{Math.max(0, Math.ceil((i.availableAt - now) / 1000))}s</div>
            ) : (
              <div className="mt-1 whitespace-pre-wrap text-[15px]">
                {i.kind !== "bedside" && <span className="mr-1 rounded bg-ok-soft px-1.5 py-0.5 text-[11px] font-bold text-ok">RESULTS BACK</span>}
                {i.result}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
