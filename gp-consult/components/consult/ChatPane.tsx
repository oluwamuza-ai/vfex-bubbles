"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn } from "@/lib/schemas/consult";

export function ChatPane({
  id,
  transcript,
  onTranscript,
  onError,
}: {
  id: string;
  transcript: ChatTurn[];
  onTranscript: (t: ChatTurn[]) => void;
  onError: (e: string) => void;
}) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript.length, streaming]);

  const send = async () => {
    const content = input.trim();
    if (!content || streaming != null) return;
    setInput("");
    const withDoctor: ChatTurn[] = [...transcript, { role: "doctor", content, at: Date.now() }];
    onTranscript(withDoctor);
    setStreaming("");
    try {
      const res = await fetch(`/api/consult/${id}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "The patient didn't respond");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setStreaming(text);
      }
      onTranscript([...withDoctor, { role: "patient", content: text.trim(), at: Date.now() }]);
    } catch (e) {
      onTranscript(transcript);
      setInput(content);
      onError((e as Error).message);
    } finally {
      setStreaming(null);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-2 pb-3">
        {transcript.length === 0 && streaming == null && (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
            Call the patient in and open the consultation. Ask as you would in clinic — they will only tell you what you ask about.
          </p>
        )}
        {transcript.map((t, i) => (
          <Bubble key={i} role={t.role} text={t.content} />
        ))}
        {streaming != null && <Bubble role="patient" text={streaming || "…"} live />}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-16 z-10 -mx-4 border-t border-line bg-bg/95 px-4 py-2 backdrop-blur sm:bottom-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask the patient…"
            className="input max-h-32 min-h-11 resize-none"
            aria-label="Message to patient"
          />
          <button className="btn-primary h-11 shrink-0" onClick={send} disabled={!input.trim() || streaming != null}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, text, live }: { role: ChatTurn["role"]; text: string; live?: boolean }) {
  const doctor = role === "doctor";
  return (
    <div className={`flex ${doctor ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
          doctor ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md border border-line bg-surface"
        } ${live ? "opacity-90" : ""}`}
      >
        {text}
      </div>
    </div>
  );
}
