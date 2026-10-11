"use client";

import { useEffect, useState } from "react";

export const CONSULT_MS = 10 * 60 * 1000;

export function GpClock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = startedAt + CONSULT_MS - now;
  const over = left < 0;
  const abs = Math.abs(left);
  const mm = Math.floor(abs / 60000);
  const ss = Math.floor((abs % 60000) / 1000).toString().padStart(2, "0");
  const cls = over ? "bg-danger-soft text-danger" : left < 120000 ? "bg-warn-soft text-warn" : "bg-surface-2 text-ink";
  return (
    <div className={`shrink-0 rounded-xl px-3 py-1.5 text-center font-mono text-lg font-bold tabular-nums ${cls}`} aria-label="GP clock">
      {over ? "+" : ""}
      {mm}:{ss}
      <div className="font-sans text-[10px] font-semibold uppercase tracking-wide opacity-70">{over ? "overrun" : "left"}</div>
    </div>
  );
}
