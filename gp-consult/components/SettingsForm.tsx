"use client";

import { useState } from "react";
import type { Settings } from "@/lib/repo/settings";

export function SettingsForm({ initial, models }: { initial: Settings; models: { patient: string; grader: string; mock: boolean; key: boolean } }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const save = async (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    const res = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(res.ok ? "Saved" : "Save failed");
    setTimeout(() => setMsg(""), 1500);
  };
  const count = s.formulary.split(/\n|,/).map((x) => x.trim()).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="card divide-y divide-line py-1">
        <Toggle label="10-minute GP clock" hint="Default for new consultations and clinics. Finishing in time earns a bonus." checked={s.gpClock} onChange={(v) => save({ gpClock: v })} />
        <Toggle
          label="Local practice mode (Zimbabwe / EDLIZ)"
          hint="Grading still scores against NICE, but adds notes where EDLIZ practice or local drug availability would change the plan, and flags prescribed drugs not on your formulary."
          checked={s.localPractice}
          onChange={(v) => save({ localPractice: v })}
        />
      </div>

      <div className={`card space-y-2 ${s.localPractice ? "" : "opacity-60"}`}>
        <label className="label" htmlFor="formulary">Available formulary · {count} drug{count === 1 ? "" : "s"}</label>
        <p className="text-sm text-muted">Paste one drug per line (or comma-separated). Used only when local practice mode is on.</p>
        <textarea id="formulary" className="input min-h-48 font-mono text-[13px]" value={s.formulary} onChange={(e) => setS({ ...s, formulary: e.target.value })} placeholder={"Amoxicillin\nNitrofurantoin\nPrednisolone\n…"} />
        <button className="btn-primary" onClick={() => save({ formulary: s.formulary })}>Save formulary</button>
      </div>

      <div className="card text-sm">
        <div className="label">Models</div>
        <div>Patient / exam / results: <code>{models.patient}</code></div>
        <div>Case generation / grading / updates: <code>{models.grader}</code></div>
        <div className="mt-1 text-muted">
          {models.mock ? "MOCK_LLM is on — canned offline responses, no API calls." : models.key ? "Anthropic API key configured." : "ANTHROPIC_API_KEY is not set — add it to .env.local."}
        </div>
      </div>
      {msg && <p className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-1.5 text-sm text-bg sm:bottom-6">{msg}</p>}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-muted">{hint}</div>
      </div>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-surface-2 ring-1 ring-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}
