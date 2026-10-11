import { describe, expect, it } from "vitest";
import { classifyTest } from "@/lib/investigations";
import { flagOffFormulary } from "@/lib/formulary";
import { computeOverall, DOMAINS } from "@/lib/schemas/grade";
import { ConditionCard } from "@/lib/schemas/card";
import { builtInCards } from "@/seed/cards";
import { seedVignettes } from "@/seed/rapidfire";

describe("investigation classification", () => {
  it.each([
    ["Urine dipstick", "bedside"],
    ["ECG", "bedside"],
    ["Capillary glucose", "bedside"],
    ["Urine pregnancy test", "bedside"],
    ["Peak flow", "bedside"],
    ["Fasting plasma glucose", "lab"],
    ["FBC", "lab"],
    ["Serum urate", "lab"],
    ["Chest X-ray", "imaging"],
    ["Pelvic ultrasound", "imaging"],
    ["CT head", "imaging"],
  ])("%s → %s", (t, k) => expect(classifyTest(t)).toBe(k));
});

describe("formulary", () => {
  const f = ["Amoxicillin", "Nitrofurantoin", "Prednisolone tablets", "Salbutamol inhaler"];
  it("flags drugs not on the list", () => {
    expect(flagOffFormulary(["Nitrofurantoin MR 100 mg", "Trimethoprim", "amoxicillin"], f)).toEqual(["Trimethoprim"]);
  });
  it("flags nothing when no formulary is set", () => {
    expect(flagOffFormulary(["Anything"], [])).toEqual([]);
  });
});

describe("overall score", () => {
  it("is a weighted percentage", () => {
    const all = (s: number) => DOMAINS.map((d) => ({ domain: d, score: s, evidence: [], missed: [], guidelinePoints: [], comment: "" }));
    expect(computeOverall(all(10))).toBe(100);
    expect(computeOverall(all(5))).toBe(50);
    expect(computeOverall(all(0))).toBe(0);
  });
});

describe("seed content", () => {
  it("has ~20 valid cards across all five specialties, with unique ids", () => {
    expect(builtInCards.length).toBeGreaterThanOrEqual(20);
    const ids = new Set(builtInCards.map((c) => c.id));
    expect(ids.size).toBe(builtInCards.length);
    for (const c of builtInCards) {
      expect(() => ConditionCard.parse({ ...c, verified: false })).not.toThrow();
      expect(c.body.sources.length).toBeGreaterThan(0);
      expect(c.body.redFlags.length).toBeGreaterThan(0);
    }
    expect(new Set(builtInCards.map((c) => c.specialty)).size).toBe(5);
  });
  it("rapid-fire vignettes reference real cards", () => {
    const ids = new Set(builtInCards.map((c) => c.id));
    for (const v of seedVignettes) expect(ids.has(v.conditionId)).toBe(true);
  });
});

import { diffCardBody } from "@/lib/cardDiff";
describe("card diff", () => {
  it("reports added and removed lines per field", () => {
    const a = builtInCards[0].body;
    const b = structuredClone(a);
    b.firstLine = [...b.firstLine.slice(1), "New line"];
    b.thresholds = [...b.thresholds, { label: "X", value: "1 mg" }];
    const d = diffCardBody(a, b);
    expect(d.map((x) => x.label)).toEqual(["First-line management", "Key thresholds / doses"]);
    expect(d[0].added).toEqual(["New line"]);
    expect(d[0].removed).toEqual([a.firstLine[0]]);
    expect(diffCardBody(a, a)).toEqual([]);
  });
});
