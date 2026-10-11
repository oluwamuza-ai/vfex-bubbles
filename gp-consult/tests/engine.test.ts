import { describe, expect, it } from "vitest";
import { expected, performance, START_RATING, tierFor, TIER_RATING, updateRating } from "@/lib/engine/elo";
import { DAY_MS, quality, schedule } from "@/lib/engine/srs";
import { chooseNext } from "@/lib/engine/select";
import { consultXp, dayKey, level, streak } from "@/lib/engine/xp";

describe("elo", () => {
  it("expected score is 0.5 for equal ratings", () => {
    expect(expected(1000, 1000)).toBeCloseTo(0.5);
  });
  it("60% is par against an equally rated case", () => {
    expect(performance(60)).toBeCloseTo(0.5);
    expect(updateRating(1000, 2, 60, 40)).toBeCloseTo(1000);
  });
  it("strong performance raises rating, weak lowers it", () => {
    expect(updateRating(1000, 2, 90, 40)).toBeGreaterThan(1000);
    expect(updateRating(1000, 2, 35, 40)).toBeLessThan(1000);
  });
  it("beating a harder case gains more than beating an easier one", () => {
    expect(updateRating(1000, 4, 80, 40) - 1000).toBeGreaterThan(updateRating(1000, 1, 80, 40) - 1000);
  });
  it("pitches the next case just above the current rating", () => {
    expect(tierFor(START_RATING)).toBe(2);
    expect(tierFor(700)).toBe(1);
    expect(tierFor(1150)).toBe(3);
    expect(tierFor(2000)).toBe(5);
    for (let r = 600; r < 1800; r += 50) expect(TIER_RATING[tierFor(r)]).toBeGreaterThanOrEqual(Math.min(r - 100, TIER_RATING[5]));
  });
});

describe("spaced repetition", () => {
  const now = 1_000_000;
  const fresh = { reps: 0, ease: 2.5, intervalDays: 0 };
  it("weak performance returns tomorrow", () => {
    const s = schedule(fresh, 40, now);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(now + DAY_MS);
  });
  it("good performance spaces out 3 → 7 → longer", () => {
    const a = schedule(fresh, 80, now);
    const b = schedule(a, 80, now);
    const c = schedule(b, 90, now);
    expect([a.intervalDays, b.intervalDays]).toEqual([3, 7]);
    expect(c.intervalDays).toBeGreaterThan(14);
  });
  it("a lapse resets reps and lowers ease", () => {
    const a = schedule(schedule(fresh, 90, now), 90, now);
    const lapse = schedule(a, 20, now);
    expect(lapse.reps).toBe(0);
    expect(lapse.ease).toBeLessThan(a.ease);
    expect(lapse.ease).toBeGreaterThanOrEqual(1.3);
  });
  it("quality bands", () => {
    expect([quality(90), quality(78), quality(62), quality(50), quality(35), quality(10)]).toEqual([5, 4, 3, 2, 1, 0]);
  });
});

describe("case selection", () => {
  const cards = [
    { id: "a", specialty: "medicine" },
    { id: "b", specialty: "medicine" },
    { id: "c", specialty: "psychiatry" },
  ];
  it("prefers overdue conditions", () => {
    const pick = chooseNext({
      cards,
      mastery: [
        { conditionId: "a", rating: 1200, dueAt: 50, attempts: 2 },
        { conditionId: "b", rating: 800, dueAt: 500, attempts: 2 },
      ],
      specialtyRatings: {},
      now: 100,
    });
    expect(pick?.conditionId).toBe("a");
    expect(pick?.reason).toBe("due");
    expect(pick?.tier).toBe(tierFor(1200));
  });
  it("then unseen conditions from the weakest specialty", () => {
    const pick = chooseNext({
      cards,
      mastery: [{ conditionId: "a", rating: 1000, dueAt: 999, attempts: 1 }],
      specialtyRatings: { medicine: 1100, psychiatry: 850 },
      now: 100,
    });
    expect(pick?.conditionId).toBe("c");
    expect(pick?.tier).toBe(tierFor(850));
  });
  it("respects specialty filter and exclusions", () => {
    const pick = chooseNext({ cards, mastery: [], specialtyRatings: {}, now: 0, specialty: "medicine", exclude: ["a"] });
    expect(pick?.conditionId).toBe("b");
    expect(chooseNext({ cards, mastery: [], specialtyRatings: {}, now: 0, specialty: "surgery" })).toBeNull();
  });
});

describe("xp and streaks", () => {
  it("scales with tier and rewards beating the clock", () => {
    expect(consultXp(80, 1, false, 0)).toBe(80);
    expect(consultXp(80, 5, false, 0)).toBe(160);
    expect(consultXp(80, 1, true, 9 * 60_000)).toBe(100);
    expect(consultXp(80, 1, true, 11 * 60_000)).toBe(80);
  });
  it("counts consecutive days, tolerating no activity yet today", () => {
    expect(streak(["2026-10-09", "2026-10-10", "2026-10-11"], "2026-10-11")).toBe(3);
    expect(streak(["2026-10-09", "2026-10-10"], "2026-10-11")).toBe(2);
    expect(streak(["2026-10-08", "2026-10-10"], "2026-10-11")).toBe(1);
    expect(streak([], "2026-10-11")).toBe(0);
  });
  it("formats days in a fixed timezone", () => {
    expect(dayKey(Date.UTC(2026, 9, 11, 23, 30), "Africa/Harare")).toBe("2026-10-12");
  });
  it("levels", () => {
    expect(level(0).level).toBe(1);
    expect(level(250).level).toBe(2);
    expect(level(749).level).toBe(2);
  });
});

describe("case selection with pre-generated cases", () => {
  it("prefers an unseen condition that already has a cached case", () => {
    const cards = [
      { id: "a", specialty: "medicine" },
      { id: "b", specialty: "medicine" },
      { id: "c", specialty: "medicine" },
    ];
    for (let i = 0; i < 20; i++) {
      expect(chooseNext({ cards, mastery: [], specialtyRatings: {}, now: 0, cachedIds: ["b"] })?.conditionId).toBe("b");
    }
  });
});
