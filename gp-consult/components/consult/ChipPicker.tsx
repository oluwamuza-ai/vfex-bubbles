"use client";

import { useState } from "react";

/** Multi-select quick chips plus a free-text field; submits the combined list. */
export function ChipPicker({
  options,
  placeholder,
  actionLabel,
  busyLabel,
  busy,
  disabled,
  onSubmit,
}: {
  options: string[];
  placeholder: string;
  actionLabel: string;
  busyLabel: string;
  busy: boolean;
  disabled?: (o: string) => boolean;
  onSubmit: (items: string[]) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [free, setFree] = useState("");

  const toggle = (o: string) => setSelected((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]));
  const items = [...selected, ...free.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)];

  const go = async () => {
    if (!items.length) return;
    if (await onSubmit(items)) {
      setSelected([]);
      setFree("");
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          const off = disabled?.(o);
          return (
            <button
              key={o}
              type="button"
              disabled={off}
              onClick={() => toggle(o)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                on ? "border-accent bg-accent-soft text-accent" : "border-line text-ink"
              } ${off ? "opacity-40 line-through" : ""}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          value={free}
          onChange={(e) => setFree(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder={placeholder}
        />
        <button className="btn-primary shrink-0" disabled={busy || !items.length} onClick={go}>
          {busy ? busyLabel : `${actionLabel}${items.length > 1 ? ` (${items.length})` : ""}`}
        </button>
      </div>
    </div>
  );
}
