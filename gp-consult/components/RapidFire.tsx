"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Answer = "urgent" | "routine" | "safetynet";
type Item = { id: string; vignette: string; answer: Answer; rationale: string; source: string };
type Result = Item & { given: Answer };

const ROUND_MS = 60_000;
const CHOICES: { key: Answer; label: string; cls: string }[] = [
  { key: "urgent", label: "Urgent referral", cls: "bg-danger text-white" },
  { key: "routine", label: "Routine", cls: "bg-accent text-on-accent" },
  { key: "safetynet", label: "Safety-net & review", cls: "bg-warn text-white dark:text-[#2a1d05]" },
];
const LABEL: Record<Answer, string> = { urgent: "Urgent referral", routine: "Routine", safetynet: "Safety-net & review" };

export function RapidFire({ best, bank }: { best: number; bank: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [flash, setFlash] = useState<Result | null>(null);
  const [left, setLeft] = useState(ROUND_MS);
  const [xp, setXp] = useState(0);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const endAt = useRef(0);
  const ended = useRef(false);

  const finish = useCallback(async (res: Result[]) => {
    if (ended.current) return;
    ended.current = true;
    setPhase("done");
    const correct = res.filter((r) => r.given === r.answer).length;
    const r = await fetch("/api/rapid-fire/round", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ correct, answered: res.length }) });
    if (r.ok) setXp((await r.json()).xp ?? 0);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      const l = endAt.current - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(t);
        setResults((r) => {
          finish(r);
          return r;
        });
      }
    }, 200);
    return () => clearInterval(t);
  }, [phase, finish]);

  const start = async () => {
    setBusy("Loading…");
    const res = await fetch("/api/rapid-fire", { cache: "no-store" });
    setBusy("");
    if (!res.ok) return setMsg("Could not load vignettes");
    setItems(await res.json());
    setIdx(0);
    setResults([]);
    setFlash(null);
    setXp(0);
    ended.current = false;
    endAt.current = Date.now() + ROUND_MS;
    setLeft(ROUND_MS);
    setPhase("playing");
  };

  const answer = (given: Answer) => {
    if (phase !== "playing" || flash) return;
    const r = { ...items[idx], given };
    const next = [...results, r];
    setResults(next);
    setFlash(r);
    setTimeout(() => {
      setFlash(null);
      if (idx + 1 >= items.length) finish(next);
      else setIdx((i) => i + 1);
    }, r.given === r.answer ? 450 : 1400);
  };

  const generate = async () => {
    setBusy("Writing new vignettes…");
    setMsg("");
    const res = await fetch("/api/rapid-fire/generate", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy("");
    setMsg(res.ok ? `Added ${j.added} new vignettes.` : j.error || "Generation failed");
    router.refresh();
  };

  if (phase === "ready") {
    return (
      <div className="space-y-3">
        <div className="card space-y-2 text-center">
          <div className="text-5xl">⚑</div>
          <p className="text-[15px]">60 seconds. Short vignettes. Choose <strong>urgent referral</strong>, <strong>routine</strong>, or <strong>safety-net &amp; review</strong>.</p>
          <p className="text-sm text-muted">Best round: {best} correct · {bank} vignettes in the bank · 5 XP per correct answer</p>
          <button className="btn-primary w-full py-3 text-base" disabled={!!busy} onClick={start}>{busy || "Start round"}</button>
        </div>
        <button className="btn-ghost w-full" disabled={!!busy} onClick={generate}>Generate fresh vignettes from your cards</button>
        {msg && <p className="text-center text-sm text-muted">{msg}</p>}
      </div>
    );
  }

  if (phase === "done") {
    const correct = results.filter((r) => r.given === r.answer).length;
    return (
      <div className="space-y-3">
        <div className="card text-center">
          <div className="text-4xl font-black">{correct}<span className="text-xl text-muted">/{results.length}</span></div>
          <div className="text-sm text-muted">{correct > best ? "New best!" : `Best: ${Math.max(best, correct)}`}{xp ? ` · +${xp} XP` : ""}</div>
          <button className="btn-primary mt-3 w-full" onClick={start}>Play again</button>
        </div>
        <ul className="space-y-2">
          {results.map((r, i) => {
            const ok = r.given === r.answer;
            return (
              <li key={i} className={`card py-3 text-sm ${ok ? "" : "border-danger/50"}`}>
                <div className="flex gap-2">
                  <span aria-label={ok ? "correct" : "wrong"} className={ok ? "text-ok" : "text-danger"}>{ok ? "✓" : "✗"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.vignette}</p>
                    <p className="mt-1 text-muted">
                      <strong className="text-ink">{LABEL[r.answer]}</strong>{!ok && <> (you: {LABEL[r.given]})</>} — {r.rationale} <span className="whitespace-nowrap">[{r.source}]</span>
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const item = items[idx];
  const secs = Math.ceil(left / 1000);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${secs <= 10 ? "bg-danger" : "bg-accent"}`} style={{ width: `${(left / ROUND_MS) * 100}%` }} />
        </div>
        <span className="w-10 text-right font-mono font-bold tabular-nums">{secs}s</span>
        <span className="chip">{results.filter((r) => r.given === r.answer).length} ✓</span>
      </div>
      <div className={`card flex min-h-40 items-center justify-center text-center text-lg font-semibold leading-snug transition ${flash ? (flash.given === flash.answer ? "border-ok bg-ok-soft" : "border-danger bg-danger-soft") : ""}`}>
        {flash && flash.given !== flash.answer ? (
          <div className="text-base font-normal">
            <div className="font-bold text-danger">{LABEL[flash.answer]}</div>
            <div className="mt-1">{flash.rationale}</div>
          </div>
        ) : (
          item?.vignette
        )}
      </div>
      <div className="grid gap-2">
        {CHOICES.map((c) => (
          <button key={c.key} className={`btn py-4 text-base ${c.cls}`} onClick={() => answer(c.key)} disabled={!!flash}>{c.label}</button>
        ))}
      </div>
    </div>
  );
}
