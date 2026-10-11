import fs from "node:fs";
import path from "node:path";
import { ConditionCard } from "@/lib/schemas/card";
import type { SeedCard } from "./types";
import { medicineCards } from "./medicine";
import { surgeryCards } from "./surgery";
import { obgynCards } from "./obgyn";
import { paediatricsCards } from "./paediatrics";
import { psychiatryCards } from "./psychiatry";

export const builtInCards: SeedCard[] = [
  ...medicineCards,
  ...surgeryCards,
  ...obgynCards,
  ...paediatricsCards,
  ...psychiatryCards,
];

/** Cards dropped into seed/cards/custom/*.json (one card object or an array per file). */
export function customCards(): SeedCard[] {
  const dir = path.join(process.cwd(), "seed", "cards", "custom");
  if (!fs.existsSync(dir)) return [];
  const out: SeedCard[] = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const item of Array.isArray(raw) ? raw : [raw]) {
      const parsed = ConditionCard.omit({ verified: true }).safeParse(item);
      if (!parsed.success) {
        console.warn(`[cards] skipping invalid card in ${f}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
        continue;
      }
      out.push(parsed.data);
    }
  }
  return out;
}
