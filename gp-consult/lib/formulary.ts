/** Normalise a drug string to its leading name, e.g. "Nitrofurantoin MR 100 mg" → "nitrofurantoin". */
function drugKey(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["tablets", "tablet", "capsules", "oral", "cream", "spray", "inhaler", "mg", "micrograms"].includes(w))
    .join(" ")
    .trim();
}

/** Return prescribed drugs that don't match any entry on the available formulary (empty formulary → nothing flagged). */
export function flagOffFormulary(drugs: string[], formulary: string[]): string[] {
  if (!formulary.length) return [];
  const keys = formulary.map(drugKey).filter(Boolean);
  return drugs.filter((d) => {
    const k = drugKey(d);
    if (!k) return false;
    const first = k.split(" ")[0];
    return !keys.some((f) => f === k || f.split(" ")[0] === first || k.includes(f) || f.includes(first));
  });
}
