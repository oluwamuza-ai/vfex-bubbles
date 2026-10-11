import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";

export type Settings = {
  gpClock: boolean;
  localPractice: boolean;
  formulary: string; // one drug per line
};

const DEFAULTS: Settings = { gpClock: false, localPractice: false, formulary: "" };

export function getSettings(): Settings {
  const row = getDb().select().from(schema.settings).where(eq(schema.settings.key, "app")).get();
  return { ...DEFAULTS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  getDb().insert(schema.settings).values({ key: "app", value: next }).onConflictDoUpdate({ target: schema.settings.key, set: { value: next } }).run();
  return next;
}

export function formularyList(s: Settings = getSettings()): string[] {
  return s.formulary.split(/\n|,/).map((l) => l.trim()).filter(Boolean);
}
