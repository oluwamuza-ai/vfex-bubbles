"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Reading your transcript…", "Checking red-flag screening…", "Comparing management with the condition card…", "Writing a model consultation…"];

export function GradeTrigger({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const started = useRef(false);

  const run = async () => {
    setError("");
    const res = await fetch(`/api/consult/${id}/grade`, { method: "POST" });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Grading failed");
    router.refresh();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card mt-6 space-y-3 text-center">
      {error ? (
        <>
          <p className="text-danger">{error}</p>
          <button className="btn-primary" onClick={run}>Retry grading</button>
        </>
      ) : (
        <>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-surface-2 border-t-accent" />
          <p className="font-semibold">The examiner is reviewing your consultation</p>
          <p className="text-sm text-muted">{STEPS[step]}</p>
        </>
      )}
    </div>
  );
}
