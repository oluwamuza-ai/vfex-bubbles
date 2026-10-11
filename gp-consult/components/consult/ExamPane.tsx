"use client";

import { useState } from "react";
import type { ExamRecord } from "@/lib/schemas/consult";
import { QUICK_EXAMS } from "@/lib/investigations";
import { ChipPicker } from "./ChipPicker";

export function ExamPane({
  id,
  exams,
  onExams,
  onError,
}: {
  id: string;
  exams: ExamRecord[];
  onExams: (e: ExamRecord[]) => void;
  onError: (e: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const submit = async (requests: string[]) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/consult/${id}/exam`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requests }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Examination failed");
      onExams([...exams, ...body.exams]);
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
        options={QUICK_EXAMS}
        placeholder="Specific exam, e.g. ‘straight leg raise’, ‘Murphy’s sign’"
        actionLabel="Examine"
        busyLabel="Examining…"
        busy={busy}
        onSubmit={submit}
      />
      <div className="space-y-2">
        {[...exams].reverse().map((e, i) => (
          <div key={i} className="card py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{e.request}</div>
            <div className="mt-1 text-[15px]">{e.findings}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
