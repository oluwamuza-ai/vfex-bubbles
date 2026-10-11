import { CARD_LIST_FIELDS, type CardBody } from "@/lib/schemas/card";

export type FieldDiff = { label: string; added: string[]; removed: string[] };

const thr = (b: CardBody) => b.thresholds.map((t) => `${t.label}: ${t.value}`);
const src = (b: CardBody) => b.sources.map((s) => `${s.title} — ${s.url}`);

/** Line-level diff per card field (order-insensitive, which matches how cards are read). */
export function diffCardBody(before: CardBody, after: CardBody): FieldDiff[] {
  const fields: [string, string[], string[]][] = [
    ...CARD_LIST_FIELDS.map((f) => [f.label, before[f.key], after[f.key]] as [string, string[], string[]]),
    ["Key thresholds / doses", thr(before), thr(after)],
    ["Sources", src(before), src(after)],
  ];
  return fields
    .map(([label, a, b]) => {
      const A = new Set(a);
      const B = new Set(b);
      return { label, added: b.filter((x) => !A.has(x)), removed: a.filter((x) => !B.has(x)) };
    })
    .filter((d) => d.added.length || d.removed.length);
}
