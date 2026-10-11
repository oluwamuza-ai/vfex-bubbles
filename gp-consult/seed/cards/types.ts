import type { ConditionCard } from "@/lib/schemas/card";

/** Seed cards are always imported as unverified. */
export type SeedCard = Omit<ConditionCard, "verified">;
