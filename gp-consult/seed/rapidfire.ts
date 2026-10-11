import type { RapidFireAnswer } from "@/db/schema";

export type SeedVignette = {
  id: string;
  conditionId: string;
  vignette: string;
  answer: RapidFireAnswer;
  rationale: string;
  source: string;
};

const v = (
  id: string,
  conditionId: string,
  vignette: string,
  answer: RapidFireAnswer,
  rationale: string,
  source: string,
): SeedVignette => ({ id, conditionId, vignette, answer, rationale, source });

// "urgent" = urgent/emergency/2WW referral or same-day assessment;
// "routine" = routine referral or routine management in primary care;
// "safetynet" = manage in primary care with safety-netting and review.
export const seedVignettes: SeedVignette[] = [
  v("rf-htn-1", "hypertension", "62M, clinic BP 186/124, new blurred vision, fundoscopy shows flame haemorrhages.", "urgent", "Severe hypertension with retinal haemorrhage → same-day specialist assessment.", "NICE NG136"),
  v("rf-htn-2", "hypertension", "48F, clinic BP 152/94 on two readings, asymptomatic, no TOD.", "routine", "Offer ABPM/HBPM to confirm diagnosis; routine.", "NICE NG136"),
  v("rf-htn-3", "hypertension", "29M, BP 168/104 confirmed on ABPM, no symptoms.", "routine", "Age <40 with hypertension → refer for secondary cause evaluation (non-urgent) while starting workup.", "NICE NG136"),
  v("rf-dm-1", "t2dm", "66F, new diabetes on HbA1c, 6 kg unintentional weight loss over 3 months.", "urgent", "≥60 with weight loss and new-onset diabetes → urgent direct-access CT (pancreatic cancer).", "NICE NG12"),
  v("rf-dm-2", "t2dm", "58M with T2DM, new neuropathic ulcer on hallux with spreading cellulitis.", "urgent", "Active diabetic foot problem → MDT foot service within 1 working day.", "NICE NG19"),
  v("rf-asthma-1", "asthma", "34F asthmatic, PEF 30% of best, SpO2 91%, can't complete sentences.", "urgent", "Life-threatening asthma → 999.", "BTS/SIGN asthma"),
  v("rf-asthma-2", "asthma", "22M, mild wheeze after a cold, PEF 80% best, using SABA twice a day.", "safetynet", "Mild exacerbation; review treatment, PAAP, safety-net.", "NICE NG245"),
  v("rf-copd-1", "copd-exacerbation", "72M COPD, increased purulent sputum, SpO2 93% (baseline 94%), coping at home.", "safetynet", "Manage at home: prednisolone 30 mg 5 days ± antibiotic; safety-net.", "NICE NG115/NG114"),
  v("rf-copd-2", "copd-exacerbation", "70F COPD, new confusion, RR 32, SpO2 86%.", "urgent", "Severe exacerbation features → hospital admission.", "NICE NG115"),
  v("rf-af-1", "atrial-fibrillation", "76F, AF rate 165, BP 84/50, dizzy.", "urgent", "Haemodynamically unstable AF → emergency admission.", "NICE NG196"),
  v("rf-af-2", "atrial-fibrillation", "69M, incidental AF rate 88, asymptomatic, CHA2DS2-VASc 3.", "routine", "Rate control and anticoagulation in primary care.", "NICE NG196"),
  v("rf-acs-1", "chest-pain-acs", "55M, central chest pain 2 hours ago lasting 30 min, now pain-free.", "urgent", "Pain within 12 h → 999 / emergency admission, aspirin 300 mg.", "NICE CG95"),
  v("rf-acs-2", "chest-pain-acs", "61F, exertional chest tightness for 6 weeks relieved by rest in 2–3 minutes.", "routine", "Suspected stable angina → Rapid Access Chest Pain Clinic (not same-day).", "NICE CG95"),
  v("rf-uti-1", "uti-adult", "28F non-pregnant, dysuria and frequency 2 days, afebrile.", "safetynet", "Uncomplicated lower UTI — nitrofurantoin 3 days with safety-net.", "NICE NG109"),
  v("rf-uti-2", "uti-adult", "31F at 24 weeks, fever 38.6, loin pain, vomiting.", "urgent", "Pyelonephritis in pregnancy with vomiting → admit.", "NICE NG111"),
  v("rf-uti-3", "uti-adult", "58M, painless visible haematuria, dipstick nitrite negative, culture negative.", "urgent", "≥45 with unexplained visible haematuria → 2WW urology.", "NICE NG12"),
  v("rf-gout-1", "gout", "64M, hot swollen knee, temp 38.9, rigors, no previous gout.", "urgent", "Possible septic arthritis → same-day referral for aspiration.", "NICE CKS Gout"),
  v("rf-gout-2", "gout", "52M, third podagra flare this year, afebrile, eGFR 72.", "routine", "Treat flare; offer treat-to-target allopurinol after settling.", "NICE NG219"),
  v("rf-ha-1", "headache", "41F, sudden worst headache peaking within a minute while lifting.", "urgent", "Thunderclap headache → emergency assessment for SAH.", "NICE CG150"),
  v("rf-ha-2", "headache", "72F, new temporal headache, jaw claudication, scalp tenderness, vision normal.", "urgent", "Suspected GCA → prednisolone today and same-day specialist referral.", "NICE CKS GCA"),
  v("rf-ha-3", "headache", "26F, recurrent unilateral pulsating headaches with nausea, normal neuro exam.", "safetynet", "Migraine — acute treatment, diary, safety-net.", "NICE CG150"),
  v("rf-appx-1", "acute-abdomen-appendicitis", "19M, periumbilical pain moved to RIF, anorexia, rebound tenderness.", "urgent", "Suspected appendicitis → same-day surgical referral.", "NICE CKS Appendicitis"),
  v("rf-lbp-1", "low-back-pain", "45F, sciatica with new saddle numbness and difficulty passing urine.", "urgent", "Suspected cauda equina → emergency same-day.", "NICE NG59"),
  v("rf-lbp-2", "low-back-pain", "35M, 1 week of mechanical low back pain after lifting, no red flags.", "safetynet", "Stay active, NSAID, safety-net for CES symptoms.", "NICE NG59"),
  v("rf-crc-1", "rectal-bleeding-colorectal", "67M, 8 weeks looser stools, FIT 42 µg Hb/g.", "urgent", "FIT ≥10 → suspected cancer pathway referral.", "NICE DG56"),
  v("rf-crc-2", "rectal-bleeding-colorectal", "24F, bright red blood on paper with painful defecation, visible posterior fissure.", "safetynet", "Anal fissure — laxatives, topical treatment, safety-net.", "NICE CKS Anal fissure"),
  v("rf-pet-1", "pre-eclampsia", "33F, 34 weeks, BP 150/98, 2+ protein, mild headache.", "urgent", "Suspected pre-eclampsia → same-day maternity assessment.", "NICE NG133"),
  v("rf-pet-2", "pre-eclampsia", "38F, 10 weeks, first pregnancy, BMI 37.", "routine", "≥2 moderate risk factors → aspirin 75–150 mg from 12 weeks; routine.", "NICE NG133"),
  v("rf-ect-1", "ectopic-pregnancy", "27F, LMP 7 weeks ago, positive UPT, left iliac fossa pain and shoulder-tip pain.", "urgent", "Positive pregnancy test with pain → immediate EPAU/emergency.", "NICE NG126"),
  v("rf-ect-2", "ectopic-pregnancy", "30F, 5 weeks by dates, light spotting, no pain, no risk factors.", "safetynet", "<6 weeks bleeding, no pain → expectant, repeat test 7–10 days.", "NICE NG126"),
  v("rf-pcos-1", "pcos", "23F, irregular periods, rapidly progressive hirsutism, deepening voice over 4 months.", "urgent", "Virilisation → urgent assessment for androgen-secreting tumour.", "NICE CKS PCOS"),
  v("rf-meno-1", "menopause-hrt", "58F, single episode vaginal bleeding 3 years after menopause, not on HRT.", "urgent", "Postmenopausal bleeding ≥55 → 2WW gynaecology.", "NICE NG12"),
  v("rf-meno-2", "menopause-hrt", "51F, hot flushes and night sweats affecting sleep, LMP 8 months ago.", "routine", "Clinical diagnosis; discuss HRT (sequential combined).", "NICE NG23"),
  v("rf-bronch-1", "bronchiolitis", "4-month-old, coryza then cough, RR 74, grunting, SpO2 90%.", "urgent", "Severe distress/hypoxia → 999.", "NICE NG9"),
  v("rf-bronch-2", "bronchiolitis", "9-month-old, cough and wheeze day 2, RR 44, feeding 85% normal, SpO2 96%.", "safetynet", "Mild bronchiolitis → home with safety-net.", "NICE NG9"),
  v("rf-fever-1", "febrile-child", "7-week-old with temperature 38.2°C, feeding normally.", "urgent", "Age <3 months with fever ≥38 = red → paediatric assessment.", "NICE NG143"),
  v("rf-fever-2", "febrile-child", "2-year-old, fever 3 days, otitis media, playing, normal obs.", "safetynet", "Green features → home with safety-net.", "NICE NG143"),
  v("rf-fever-3", "febrile-child", "3-year-old with fever and a non-blanching petechial rash on legs.", "urgent", "Non-blanching rash → benzylpenicillin and emergency transfer.", "NICE NG143"),
  v("rf-cuti-1", "childhood-uti", "8-week-old with fever and positive urine dip for nitrites.", "urgent", "<3 months with suspected UTI → immediate paediatric referral.", "NICE NG224"),
  v("rf-cuti-2", "childhood-uti", "6-year-old with dysuria, dip leuc+ nitrite+, afebrile, well.", "safetynet", "Lower UTI ≥3 months → 3 days trimethoprim/nitrofurantoin, safety-net.", "NICE NG224"),
  v("rf-dep-1", "depression", "34M low mood, has bought paracetamol and written a note, plans to act tonight.", "urgent", "Active plan and intent → same-day crisis team.", "NICE NG222/NG225"),
  v("rf-dep-2", "depression", "29F PHQ-9 11, functioning at work, no suicidal ideation, prefers therapy.", "routine", "Less severe depression → Talking Therapies self-referral, review.", "NICE NG222"),
  v("rf-gad-1", "gad", "40F worry for 9 months, GAD-7 13, no risk, wants help.", "routine", "Step 2 low-intensity interventions via Talking Therapies.", "NICE CG113"),
];
