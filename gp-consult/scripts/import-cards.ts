// Usage: npm run cards:import — adds any new cards from seed/cards/*.ts and seed/cards/custom/*.json
import { getDb } from "@/db/client";
import { importCards } from "@/db/seed";
import { builtInCards, customCards } from "@/seed/cards";

const added = importCards(getDb(), [...builtInCards, ...customCards()]);
console.log(added.length ? `Imported ${added.length} card(s): ${added.join(", ")}` : "No new cards to import.");
