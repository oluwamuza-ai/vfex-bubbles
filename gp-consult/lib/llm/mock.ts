// Deterministic offline stand-ins for every LLM call. Used when MOCK_LLM=1 so the
// whole app (DB writes, Elo, XP, screens) can be exercised without an API key.
// Clinical content comes straight from the ConditionCard so it stays on-topic.
import type { ConditionCard } from "@/lib/schemas/card";
import type { CaseFile } from "@/lib/schemas/case";
import type { ChatTurn } from "@/lib/schemas/consult";

const FEMALE = ["Amara Okafor", "Priya Sharma", "Fatima Hussain", "Ewa Kowalska", "Siobhan Murphy"];
const MALE = ["Tom Fletcher", "Gareth Jones", "Daniel Mensah", "Li Wei", "Mohammed Ali"];
const PAEDS_NAMES = ["Leo", "Ava", "Yusuf", "Isla", "Noah", "Zara"];

function pick<T>(arr: T[], seed: number) {
  return arr[Math.abs(seed) % arr.length];
}

export function mockCase(card: ConditionCard, tier: number, seed: number): CaseFile {
  const paeds = card.specialty === "paediatrics";
  const female = card.specialty === "obgyn" || seed % 2 === 0;
  const age = paeds ? `${(seed % 4) + 1} years` : `${30 + (seed % 45)}`;
  const name = paeds ? pick(PAEDS_NAMES, seed) : pick(female ? FEMALE : MALE, seed);
  const presentation = card.body.presentations[0] ?? card.name;
  return {
    patient: { name, age, sex: female ? "female" : "male", occupation: paeds ? "child" : "office worker", background: "Lives locally with family." },
    triageNote: `${age}${paeds ? "" : "y"} ${female ? "F" : "M"} — requested urgent appointment, "not feeling right"`,
    presentingComplaint: presentation,
    historianStyle: tier >= 5 ? "vague and tangential" : "clear and cooperative",
    attendee: paeds ? "mother of the child" : "patient",
    history: {
      hpc: presentation,
      openingStatement: "I've not been feeling right, doctor, and I thought I'd better get it checked.",
      volunteered: card.body.presentations.slice(0, 1),
      onlyIfAsked: card.body.keyHistory.slice(0, 4),
      pertinentNegatives: card.body.redFlags.slice(0, 3).map((r) => `No ${r.split(/[:(—,]/)[0].toLowerCase()}`),
      ideas: "I wondered if it was just stress.",
      concerns: "I'm worried it might be something serious.",
      expectations: "I'd like to know what it is and how to fix it.",
      hiddenAgenda: tier >= 5 ? "While I'm here, doctor, I've been sleeping badly too." : null,
    },
    pmh: tier >= 3 ? ["Chronic kidney disease stage 3a"] : [],
    drugHistory: tier >= 3 ? [{ drug: "Ramipril", dose: "5 mg OD", notes: "" }] : [],
    allergies: ["NKDA"],
    socialHistory: "Non-smoker, alcohol 6 units/week.",
    familyHistory: "Nil relevant.",
    observations: { heartRate: "84", bloodPressure: "132/82", respiratoryRate: "16", spo2: "98%", temperature: "36.9", other: "" },
    examination: card.body.examination.slice(0, 2).map((e, i) => ({ system: i === 0 ? "General" : "Focused", findings: e })),
    investigations: card.body.investigations.slice(0, 2).map((t) => ({ test: t.split(/[(:;,]/)[0], result: "Consistent with the working diagnosis" })),
    diagnosis: card.name,
    differentials: ["Alternative diagnosis A", "Alternative diagnosis B"],
    redFlagsToScreen: card.body.redFlags.slice(0, 4),
    modelPlan: {
      management: card.body.firstLine.slice(0, 3),
      prescribing: [],
      referral: card.body.referral[0] ?? "No referral",
      safetyNetting: card.body.safetyNetting.slice(0, 2),
      followUp: "Review in 2 weeks",
    },
    complicatingFactors: tier >= 3 ? ["CKD 3a"] : [],
  };
}

const ROUTES: [RegExp, (c: CaseFile) => string][] = [
  [/worr|concern|afraid|scared/i, (c) => c.history.concerns],
  [/think (it|this)|idea|what.*(caus|might be)/i, (c) => c.history.ideas],
  [/hop|expect|want.*(today|from)|like us to/i, (c) => c.history.expectations],
  [/allerg/i, (c) => (c.allergies.join(", ") === "NKDA" ? "No allergies that I know of." : `I'm allergic to ${c.allergies.join(", ")}.`)],
  [/medic|tablet|pill|take any/i, (c) => (c.drugHistory.length ? `I take ${c.drugHistory.map((d) => `${d.drug} ${d.dose}`).join(", ")}.` : "No regular medicines.")],
  [/smok|alcohol|drink|work|job|live/i, (c) => c.socialHistory],
  [/family|mum|dad|parent/i, (c) => c.familyHistory],
  [/anything else|else.*(today|mention)/i, (c) => c.history.hiddenAgenda ?? "No, that's everything, thanks."],
  [/medical (history|problem)|condition|illness/i, (c) => (c.pmh.length ? `I've got ${c.pmh.join(", ")}.` : "Nothing really, I'm usually healthy.")],
];

export function mockPatientReply(c: CaseFile, transcript: ChatTurn[]): string {
  const doctorTurns = transcript.filter((t) => t.role === "doctor");
  const last = doctorTurns.at(-1)?.content ?? "";
  if (doctorTurns.length === 1) return c.history.openingStatement;
  for (const [re, fn] of ROUTES) if (re.test(last)) return fn(c);
  const i = (doctorTurns.length - 2) % Math.max(1, c.history.onlyIfAsked.length);
  const fact = c.history.onlyIfAsked[i];
  return fact ? `Now you mention it, doctor — ${fact}.` : "I'm not sure, doctor.";
}

export function mockExam(c: CaseFile, requests: string[]) {
  return requests.map((r) => {
    if (/obs|observation|vital/i.test(r)) {
      const o = c.observations;
      return { examination: r, finding: `HR ${o.heartRate}, BP ${o.bloodPressure}, RR ${o.respiratoryRate}, SpO2 ${o.spo2}, T ${o.temperature}°C` };
    }
    const hit = c.examination.find((e) => r.toLowerCase().includes(e.system.toLowerCase()) || e.system.toLowerCase().includes(r.toLowerCase()));
    return { examination: r, finding: hit?.findings ?? "No abnormality detected." };
  });
}

export function mockInvestigations(c: CaseFile, tests: string[]) {
  return tests.map((t) => {
    const hit = c.investigations.find((i) => t.toLowerCase().includes(i.test.toLowerCase().slice(0, 6)));
    return { test: t, result: hit?.result ?? "Within normal limits." };
  });
}
