"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicConsultation } from "@/lib/repo/consultations";
import type { ChatTurn } from "@/lib/schemas/consult";
import { GpClock } from "./GpClock";
import { ChatPane } from "./ChatPane";
import { ExamPane } from "./ExamPane";
import { InvestigationPane } from "./InvestigationPane";
import { PlanForm } from "./PlanForm";

const TABS = ["History", "Examine", "Investigate", "Plan"] as const;
type Tab = (typeof TABS)[number];

export function ConsultRoom({ initial }: { initial: PublicConsultation }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>("History");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/consult/${state.id}`, { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }, [state.id]);

  // Re-fetch when the next pending result is due ("results back").
  useEffect(() => {
    const pending = state.investigations.filter((i) => i.result == null).map((i) => i.availableAt);
    if (!pending.length) return;
    const wait = Math.max(500, Math.min(...pending) - Date.now() + 300);
    timer.current = setTimeout(refresh, wait);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.investigations, refresh]);

  const setTranscript = (t: ChatTurn[]) => setState((s) => ({ ...s, transcript: t }));
  const pendingCount = state.investigations.filter((i) => i.result == null).length;
  const newResults = state.investigations.filter((i) => i.result != null && i.kind !== "bedside").length;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <div className="card mb-3 flex items-start gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Triage · Tier {state.tier}</div>
          <div className="font-semibold">{state.triage.name}, {state.triage.age}{/^\d+$/.test(state.triage.age) ? "y" : ""} {state.triage.sex === "female" ? "F" : "M"}</div>
          <div className="text-sm text-muted">{state.triage.note}</div>
        </div>
        {state.timed && <GpClock startedAt={state.startedAt} />}
      </div>

      <div className="sticky top-[53px] z-20 -mx-4 mb-3 bg-bg/95 px-4 py-1 backdrop-blur">
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative rounded-lg py-2 text-sm font-semibold ${tab === t ? "bg-accent text-on-accent" : "text-muted"}`}
            >
              {t}
              {t === "Examine" && state.exams.length > 0 && <Dot n={state.exams.length} active={tab === t} />}
              {t === "Investigate" && (pendingCount > 0 ? <Dot n={pendingCount} pending active={tab === t} /> : newResults > 0 && <Dot n={state.investigations.length} active={tab === t} />)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {error} <button className="ml-2 underline" onClick={() => setError("")}>dismiss</button>
        </div>
      )}

      <div className={tab === "History" ? "flex flex-1 flex-col" : "hidden"}>
        <ChatPane id={state.id} transcript={state.transcript} onTranscript={setTranscript} onError={setError} />
      </div>
      {tab === "Examine" && <ExamPane id={state.id} exams={state.exams} onExams={(exams) => setState((s) => ({ ...s, exams }))} onError={setError} />}
      {tab === "Investigate" && (
        <InvestigationPane id={state.id} investigations={state.investigations} onInvestigations={(investigations) => setState((s) => ({ ...s, investigations }))} onError={setError} />
      )}
      {tab === "Plan" && (
        <PlanForm
          id={state.id}
          onError={setError}
          onSubmitted={() => router.push(`/consult/${state.id}/feedback`)}
        />
      )}
    </div>
  );
}

function Dot({ n, pending, active }: { n: number; pending?: boolean; active: boolean }) {
  return (
    <span
      className={`absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${
        pending ? "animate-pulse bg-warn text-white" : active ? "bg-on-accent text-accent" : "bg-accent text-on-accent"
      }`}
    >
      {n}
    </span>
  );
}
