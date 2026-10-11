"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CardView } from "./CardView";
import { CARD_LIST_FIELDS, SPECIALTIES, SPECIALTY_LABEL, type CardBody, type ConditionCard } from "@/lib/schemas/card";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

type Draft = {
  name: string;
  specialty: ConditionCard["specialty"];
  tags: string;
  guidelineDate: string;
  lists: Record<string, string>;
  thresholds: string;
  sources: string;
};

function toDraft(c: ConditionCard): Draft {
  return {
    name: c.name,
    specialty: c.specialty,
    tags: c.tags.join(", "),
    guidelineDate: c.guidelineDate,
    lists: Object.fromEntries(CARD_LIST_FIELDS.map((f) => [f.key, c.body[f.key].join("\n")])),
    thresholds: c.body.thresholds.map((t) => `${t.label} | ${t.value}`).join("\n"),
    sources: c.body.sources.map((s) => `${s.title} | ${s.url}`).join("\n"),
  };
}

function fromDraft(d: Draft, base: { id: string; verified: boolean }): ConditionCard {
  const pairs = (s: string) => lines(s).map((l) => {
    const i = l.indexOf("|");
    return i === -1 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  });
  const body = Object.fromEntries(CARD_LIST_FIELDS.map((f) => [f.key, lines(d.lists[f.key] ?? "")])) as unknown as CardBody;
  body.thresholds = pairs(d.thresholds).map(([label, value]) => ({ label, value }));
  body.sources = pairs(d.sources).map(([title, url]) => ({ title, url }));
  return {
    id: base.id,
    verified: base.verified,
    name: d.name.trim(),
    specialty: d.specialty,
    tags: d.tags.split(",").map((t) => t.trim()).filter(Boolean),
    guidelineDate: d.guidelineDate.trim(),
    body,
  };
}

export function CardEditor({ card, isNew }: { card: ConditionCard; isNew?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => toDraft(card));
  const [verified, setVerified] = useState(card.verified);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(!!isNew);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async (markVerified?: boolean) => {
    setSaving(true);
    setMsg("");
    const v = markVerified ?? verified;
    const payload = fromDraft(draft, { id: card.id, verified: v });
    const res = await fetch(isNew ? "/api/cards" : `/api/cards/${card.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setMsg(typeof e.error === "string" ? e.error : "Save failed — check fields");
      return;
    }
    const saved = (await res.json()) as ConditionCard;
    setVerified(saved.verified);
    setMsg(markVerified === true ? "Saved and marked verified" : markVerified === false ? "Marked unverified" : "Saved");
    if (isNew) router.push(`/cards/${saved.id}`);
    else router.refresh();
  };

  if (!editing) {
    const view = fromDraft(draft, { id: card.id, verified });
    return (
      <div className="space-y-3">
        <CardView card={view} />
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur sm:bottom-4">
          <button className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          {verified ? (
            <button className="btn-ghost" disabled={saving} onClick={() => save(false)}>Mark unverified</button>
          ) : (
            <button className="btn-primary" disabled={saving} onClick={() => save(true)}>Mark verified</button>
          )}
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <label className="label">Specialty</label>
          <select className="input" value={draft.specialty} onChange={(e) => set({ specialty: e.target.value as Draft["specialty"] })}>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{SPECIALTY_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Guideline date</label>
          <input className="input" value={draft.guidelineDate} placeholder="YYYY-MM" onChange={(e) => set({ guidelineDate: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Tags (comma-separated)</label>
          <input className="input" value={draft.tags} onChange={(e) => set({ tags: e.target.value })} />
        </div>
      </div>

      {CARD_LIST_FIELDS.map((f) => (
        <div key={f.key} className="card">
          <label className="label">{f.label} <span className="normal-case font-normal">· one per line</span></label>
          <textarea
            className="input min-h-28 font-mono text-[13px] leading-relaxed"
            rows={Math.max(3, (draft.lists[f.key] ?? "").split("\n").length + 1)}
            value={draft.lists[f.key] ?? ""}
            onChange={(e) => set({ lists: { ...draft.lists, [f.key]: e.target.value } })}
          />
        </div>
      ))}
      <div className="card">
        <label className="label">Key thresholds / doses <span className="normal-case font-normal">· “label | value” per line</span></label>
        <textarea className="input min-h-28 font-mono text-[13px]" rows={draft.thresholds.split("\n").length + 1} value={draft.thresholds} onChange={(e) => set({ thresholds: e.target.value })} />
      </div>
      <div className="card">
        <label className="label">Sources <span className="normal-case font-normal">· “title | url” per line</span></label>
        <textarea className="input min-h-20 font-mono text-[13px]" rows={draft.sources.split("\n").length + 1} value={draft.sources} onChange={(e) => set({ sources: e.target.value })} />
      </div>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur sm:bottom-4">
        <button className="btn-ghost" disabled={saving} onClick={() => save()}>Save</button>
        {!isNew && <button className="btn-ghost" onClick={() => setEditing(false)}>Done</button>}
        {!isNew &&
          (verified ? (
            <button className="btn-ghost" disabled={saving} onClick={() => save(false)}>Mark unverified</button>
          ) : (
            <button className="btn-primary" disabled={saving} onClick={() => save(true)}>Save &amp; mark verified</button>
          ))}
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}
