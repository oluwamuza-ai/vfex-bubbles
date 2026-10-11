"use client";

import { useEffect, useState } from "react";
import { REFERRAL_OPTIONS, type PlanSubmission } from "@/lib/schemas/consult";

type Rx = PlanSubmission["prescriptions"][number];
const emptyRx: Rx = { drug: "", dose: "", frequency: "", duration: "" };

const EMPTY: PlanSubmission = {
  workingDiagnosis: "",
  differentials: [],
  prescriptions: [],
  nonDrug: "",
  furtherInvestigations: "",
  referral: "none",
  referralDetail: "",
  safetyNetting: "",
  followUp: "",
};

export function PlanForm({ id, onSubmitted, onError }: { id: string; onSubmitted: () => void; onError: (e: string) => void }) {
  const draftKey = `plan-draft-${id}`;
  const [plan, setPlan] = useState<PlanSubmission>(EMPTY);
  const [ddx, setDdx] = useState("");
  const [busy, setBusy] = useState(false);

  // Keep an unsent draft per consultation (survives tab switches/reloads).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const d = JSON.parse(saved);
        setPlan({ ...EMPTY, ...d.plan });
        setDdx(d.ddx ?? "");
      }
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ plan, ddx }));
    } catch {}
  }, [plan, ddx, draftKey]);

  const set = (patch: Partial<PlanSubmission>) => setPlan((p) => ({ ...p, ...patch }));
  const setRx = (i: number, patch: Partial<Rx>) => set({ prescriptions: plan.prescriptions.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const submit = async () => {
    if (!plan.workingDiagnosis.trim()) return onError("Enter a working diagnosis");
    if (!confirm("Submit your plan? The consultation ends and grading begins.")) return;
    setBusy(true);
    const payload: PlanSubmission = {
      ...plan,
      differentials: ddx.split(/\n|;/).map((s) => s.trim()).filter(Boolean),
      prescriptions: plan.prescriptions.filter((r) => r.drug.trim()),
    };
    const res = await fetch(`/api/consult/${id}/plan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) return onError((await res.json().catch(() => ({}))).error || "Submit failed");
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    onSubmitted();
  };

  return (
    <div className="space-y-3 pb-4">
      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="wd">Working diagnosis</label>
          <input id="wd" className="input" value={plan.workingDiagnosis} onChange={(e) => set({ workingDiagnosis: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ddx">Differentials <span className="normal-case font-normal">· one per line</span></label>
          <textarea id="ddx" className="input" rows={3} value={ddx} onChange={(e) => setDdx(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center">
          <span className="label mb-0">Prescriptions</span>
          <button className="ml-auto text-sm font-semibold text-accent" onClick={() => set({ prescriptions: [...plan.prescriptions, { ...emptyRx }] })}>
            + Add drug
          </button>
        </div>
        {plan.prescriptions.length === 0 && <p className="text-sm text-muted">No prescriptions.</p>}
        {plan.prescriptions.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input className="input col-span-2 sm:col-span-1" placeholder="Drug" value={r.drug} onChange={(e) => setRx(i, { drug: e.target.value })} />
            <input className="input" placeholder="Dose" value={r.dose} onChange={(e) => setRx(i, { dose: e.target.value })} />
            <input className="input" placeholder="Frequency" value={r.frequency} onChange={(e) => setRx(i, { frequency: e.target.value })} />
            <input className="input" placeholder="Duration" value={r.duration} onChange={(e) => setRx(i, { duration: e.target.value })} />
            <button className="btn-ghost" aria-label="Remove" onClick={() => set({ prescriptions: plan.prescriptions.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <div>
          <label className="label" htmlFor="nd">Non-drug management &amp; explanation</label>
          <textarea id="nd" className="input" rows={3} value={plan.nonDrug} onChange={(e) => set({ nonDrug: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="fi">Further investigations planned</label>
          <textarea id="fi" className="input" rows={2} value={plan.furtherInvestigations} onChange={(e) => set({ furtherInvestigations: e.target.value })} />
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <span className="label">Referral</span>
          <div className="flex flex-wrap gap-1.5">
            {REFERRAL_OPTIONS.map((o) => (
              <button
                key={o}
                onClick={() => set({ referral: o })}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${plan.referral === o ? "border-accent bg-accent-soft text-accent" : "border-line"}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
        {plan.referral !== "none" && (
          <input className="input" placeholder="To whom / pathway, e.g. ‘acute surgical take’, ‘2WW colorectal’" value={plan.referralDetail} onChange={(e) => set({ referralDetail: e.target.value })} />
        )}
        <div>
          <label className="label" htmlFor="sn">Safety-netting</label>
          <textarea id="sn" className="input" rows={3} value={plan.safetyNetting} onChange={(e) => set({ safetyNetting: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="fu">Follow-up</label>
          <input id="fu" className="input" value={plan.followUp} onChange={(e) => set({ followUp: e.target.value })} />
        </div>
      </div>

      <button className="btn-primary w-full py-3 text-base" disabled={busy} onClick={submit}>
        {busy ? "Submitting…" : "Submit plan & end consultation"}
      </button>
    </div>
  );
}
