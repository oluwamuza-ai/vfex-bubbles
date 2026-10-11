import type { InvestigationRecord } from "@/lib/schemas/consult";

type Kind = InvestigationRecord["kind"];

// Point-of-care tests that a GP gets back during the consultation.
const BEDSIDE = [
  /urin(e|alysis).*dip|dipstick|\burine dip|\bdip\b/i,
  /\bu(rine )?pt\b|pregnancy test|urine hcg|\bupt\b/i,
  /\becg\b|electrocardiogram/i,
  /capillary|\bcbg\b|\bbm\b|finger.?prick|bedside glucose|glucose meter|^\s*(blood )?glucose\s*$/i,
  /\bobs\b|observations|vital signs|\bnews2?\b/i,
  /peak (expiratory )?flow|\bpefr?\b/i,
  /pulse ox|\bspo2\b|oxygen sat/i,
  /\bketones?\b(?!.*serum)/i,
  /\bcrp\b.*(poc|point of care|finger)/i,
  /\bbmi\b|weight|height/i,
  /\bphq-?9\b|\bgad-?7\b|questionnaire|\bqrisk/i,
  /\bbp\b|blood pressure|lying.*standing/i,
];
const IMAGING = [/x-?ray|\bcxr\b|\baxr\b|radiograph/i, /\bct\b|computed tomography/i, /\bmri\b/i, /ultrasound|\buss\b|\bscan\b|doppler/i, /\becho/i, /\bdexa\b/i, /mammogra/i];

export function classifyTest(test: string): Kind {
  if (IMAGING.some((r) => r.test(test))) return "imaging";
  if (BEDSIDE.some((r) => r.test(test))) return "bedside";
  return "lab";
}

/** Simulated turnaround so lab/imaging results arrive later as "results back". */
export const TURNAROUND_MS: Record<Kind, number> = { bedside: 0, lab: 20_000, imaging: 30_000 };

export const QUICK_EXAMS = [
  "Observations",
  "General inspection",
  "Cardiovascular",
  "Respiratory",
  "Abdominal",
  "Neurological",
  "ENT",
  "Fundoscopy",
  "Skin",
  "Musculoskeletal",
  "Lumbar spine & lower limb neuro",
  "Breast",
  "Pelvic / speculum",
  "Mental state examination",
  "Hydration status & CRT",
  "Thyroid",
];

export const QUICK_TESTS = [
  "Urine dipstick",
  "Urine pregnancy test",
  "ECG",
  "Capillary glucose",
  "Peak flow",
  "FBC",
  "U&E / eGFR",
  "LFT",
  "CRP",
  "HbA1c",
  "TFT",
  "Lipid profile",
  "MSU culture",
  "Chest X-ray",
];
