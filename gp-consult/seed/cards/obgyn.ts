import type { SeedCard } from "./types";

export const obgynCards: SeedCard[] = [
  {
    id: "pre-eclampsia",
    name: "Hypertension in pregnancy / pre-eclampsia",
    specialty: "obgyn",
    tags: ["pregnancy", "emergency", "aspirin prophylaxis"],
    guidelineDate: "2023-04",
    body: {
      presentations: [
        "New hypertension after 20 weeks with proteinuria or maternal organ dysfunction",
        "Severe headache, visual disturbance (flashing lights, blurring), epigastric/RUQ pain, vomiting, sudden swelling of face/hands/feet",
        "Often asymptomatic, detected at antenatal check",
      ],
      redFlags: [
        "BP ≥160/110 (severe hypertension)",
        "Neurological symptoms: severe headache, visual disturbance, clonus, seizure (eclampsia)",
        "Epigastric/RUQ pain, vomiting (HELLP)",
        "Reduced fetal movements; vaginal bleeding with abdominal pain (abruption)",
        "Breathlessness (pulmonary oedema)",
      ],
      keyHistory: [
        "Gestation; previous hypertensive disease in pregnancy",
        "Symptoms listed above; fetal movements",
        "Risk factors: CKD, SLE/APS, diabetes, chronic hypertension, nulliparity, age ≥40, interval >10 years, BMI ≥35, FHx, multiple pregnancy",
        "Aspirin use from 12 weeks",
      ],
      examination: [
        "BP (appropriate cuff), repeat",
        "Urine dipstick for protein",
        "Oedema, RUQ tenderness, reflexes/clonus",
        "Symphysis-fundal height",
      ],
      investigations: [
        "Urine protein:creatinine ratio (≥30 mg/mmol significant) or albumin:creatinine ratio (≥8 mg/mmol)",
        "FBC (platelets), U&E/creatinine, LFTs (transaminases) in secondary care",
        "PlGF-based testing for suspected pre-eclampsia (20–36+6 weeks) in secondary care",
        "Fetal growth USS and CTG",
      ],
      firstLine: [
        "Aspirin 75–150 mg nightly from 12 weeks until birth if ≥1 high-risk factor or ≥2 moderate-risk factors",
        "Suspected pre-eclampsia in primary care: same-day referral to obstetric/maternity assessment unit",
        "Antihypertensive (secondary care): labetalol first-line; nifedipine MR if labetalol unsuitable; methyldopa third",
        "Target BP 135/85 mmHg",
      ],
      secondLine: [
        "Severe pre-eclampsia: admission, IV antihypertensives, magnesium sulfate for eclampsia prevention/treatment, timing of birth",
        "Postnatal: switch methyldopa within 2 days; enalapril compatible with breastfeeding",
        "Chronic hypertension pre-conception: stop ACEi/ARB/thiazides when pregnancy confirmed (ideally within 2 days)",
      ],
      referral: [
        "Same-day maternity assessment: new hypertension ≥140/90 after 20 weeks, or any suspicion of pre-eclampsia",
        "Emergency admission (999 if needed): BP ≥160/110, symptoms of severe pre-eclampsia, seizures",
      ],
      safetyNetting: [
        "Seek immediate help with severe headache, visual problems, upper abdominal pain, vomiting, sudden swelling, reduced fetal movements",
      ],
      thresholds: [
        { label: "Aspirin prophylaxis", value: "75–150 mg OD from 12 weeks to birth" },
        { label: "Severe hypertension", value: "≥160/110 mmHg" },
        { label: "Target BP on treatment", value: "135/85 mmHg" },
        { label: "Significant proteinuria", value: "uPCR ≥30 mg/mmol or uACR ≥8 mg/mmol" },
        { label: "Labetalol (secondary care)", value: "100 mg BD initially (oral)" },
      ],
      sources: [
        { title: "NICE NG133 Hypertension in pregnancy", url: "https://www.nice.org.uk/guidance/ng133" },
        { title: "NICE CKS Hypertension in pregnancy", url: "https://cks.nice.org.uk/topics/hypertension-in-pregnancy/" },
      ],
    },
  },
  {
    id: "ectopic-pregnancy",
    name: "Ectopic pregnancy",
    specialty: "obgyn",
    tags: ["early pregnancy", "emergency", "abdominal pain"],
    guidelineDate: "2023-08",
    body: {
      presentations: [
        "Abdominal or pelvic pain, amenorrhoea/missed period, vaginal bleeding (may be absent)",
        "Atypical: shoulder-tip pain, pain on defecation/urination, diarrhoea, dizziness, collapse",
        "Can present with no history of missed period",
      ],
      redFlags: [
        "Haemodynamic instability: tachycardia, hypotension, syncope, pallor",
        "Peritonism, shoulder-tip pain (haemoperitoneum)",
        "Cervical motion tenderness with positive pregnancy test",
      ],
      keyHistory: [
        "LMP, cycle, contraception (IUD/IUS, POP), possibility of pregnancy",
        "Risk factors: previous ectopic, PID/chlamydia, tubal surgery, IVF, IUD in situ, smoking",
        "Pain character, bleeding amount, dizziness/collapse",
      ],
      examination: [
        "Obs: HR, BP, temperature",
        "Abdominal tenderness, peritonism",
        "Pelvic exam: cervical motion tenderness, adnexal tenderness (not essential if referring urgently)",
      ],
      investigations: [
        "Urine pregnancy test in all women of reproductive age with abdominal/pelvic pain",
        "TVUS and serum hCG (48-hour comparison) in EPAU",
      ],
      firstLine: [
        "Positive pregnancy test with pain, abdominal tenderness, pelvic tenderness or cervical motion tenderness → immediate referral to EPAU/out-of-hours gynaecology",
        "Haemodynamically unstable → 999 / emergency department",
        "Pregnancy <6 weeks with bleeding but no pain and no risk factors: expectant management, repeat pregnancy test after 7–10 days",
      ],
      secondLine: [
        "Methotrexate (secondary care) if no significant pain, unruptured mass <35 mm, no visible heartbeat, hCG <1,500 IU/L (can offer up to 5,000)",
        "Surgery (laparoscopic salpingectomy/salpingotomy) if significant pain, mass ≥35 mm, visible heartbeat or hCG ≥5,000",
        "Anti-D immunoglobulin 250 IU for rhesus-negative women having surgical management of ectopic",
      ],
      referral: [
        "Immediate EPAU/gynaecology referral as above",
        "999 if haemodynamically unstable or collapse",
      ],
      safetyNetting: [
        "If managed expectantly: return immediately with worsening pain, shoulder-tip pain, dizziness, fainting, heavy bleeding",
        "Return if repeat pregnancy test is positive",
      ],
      thresholds: [
        { label: "Methotrexate criteria", value: "hCG <1,500 IU/L, mass <35 mm, no heartbeat, no significant pain" },
        { label: "Surgery indicated", value: "hCG ≥5,000 IU/L, mass ≥35 mm, heartbeat, significant pain" },
        { label: "Expectant (bleeding no pain)", value: "<6 weeks: repeat test in 7–10 days" },
        { label: "Anti-D (surgical management)", value: "250 IU if rhesus negative" },
      ],
      sources: [
        { title: "NICE NG126 Ectopic pregnancy and miscarriage", url: "https://www.nice.org.uk/guidance/ng126" },
        { title: "NICE CKS Ectopic pregnancy", url: "https://cks.nice.org.uk/topics/ectopic-pregnancy/" },
        { title: "RCOG Green-top 21 Diagnosis and management of ectopic pregnancy", url: "https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/diagnosis-and-management-of-ectopic-pregnancy-green-top-guideline-no-21/" },
      ],
    },
  },
  {
    id: "pcos",
    name: "Polycystic ovary syndrome",
    specialty: "obgyn",
    tags: ["endocrine", "fertility", "metabolic"],
    guidelineDate: "2023-08",
    body: {
      presentations: [
        "Oligomenorrhoea/amenorrhoea, subfertility",
        "Hirsutism, acne, androgenic alopecia",
        "Weight gain, insulin resistance, acanthosis nigricans",
      ],
      redFlags: [
        "Rapid-onset virilisation (clitoromegaly, deepening voice) or very high testosterone — exclude androgen-secreting tumour",
        "Cushingoid features",
        "Prolonged amenorrhoea with unopposed oestrogen (endometrial hyperplasia risk)",
      ],
      keyHistory: [
        "Menstrual history, fertility wishes, contraception",
        "Hirsutism/acne onset and progression",
        "Weight, mood, sleep apnoea symptoms, eating disorders",
        "FHx diabetes, PCOS",
      ],
      examination: [
        "BMI, waist, BP",
        "Hirsutism (modified Ferriman–Gallwey), acne, alopecia, acanthosis nigricans",
        "Signs of virilisation or Cushing's",
      ],
      investigations: [
        "Rotterdam criteria (2 of 3): oligo/anovulation, clinical/biochemical hyperandrogenism, polycystic ovaries on USS (or raised AMH in adults)",
        "Total testosterone, SHBG (free androgen index), FSH, LH, TSH, prolactin; 17-OH progesterone if CAH suspected",
        "Pregnancy test if amenorrhoeic",
        "Metabolic: OGTT (or HbA1c/fasting glucose), lipid profile",
        "Pelvic USS (not for diagnosis within 8 years of menarche)",
      ],
      firstLine: [
        "Lifestyle: weight loss (5–10%), exercise",
        "Combined hormonal contraception for cycle regulation and hirsutism/acne",
        "If <3–4 periods/year and not on CHC: induce withdrawal bleed with progestogen every 3–4 months (endometrial protection)",
        "Screen and manage cardiometabolic risk, depression/anxiety, OSA",
        "Eflornithine cream for facial hirsutism",
      ],
      secondLine: [
        "Metformin for metabolic features (off-label) alongside lifestyle",
        "Ovulation induction (letrozole first-line) via fertility specialist",
        "TVUS for endometrial thickness if prolonged amenorrhoea",
      ],
      referral: [
        "Urgent endocrinology if virilisation or testosterone markedly raised",
        "Fertility services if trying to conceive (after lifestyle optimisation)",
        "Gynaecology if endometrial hyperplasia concern",
      ],
      safetyNetting: [
        "Report prolonged amenorrhoea, heavy irregular bleeding, symptoms of diabetes",
        "Annual review of BP, BMI, glycaemic status",
      ],
      thresholds: [
        { label: "Withdrawal bleed frequency", value: "At least every 3–4 months" },
        { label: "Testosterone tumour concern", value: ">5 nmol/L or rapid virilisation (local lab ranges vary)" },
      ],
      sources: [
        { title: "NICE CKS Polycystic ovary syndrome", url: "https://cks.nice.org.uk/topics/polycystic-ovary-syndrome/" },
        { title: "International evidence-based PCOS guideline 2023", url: "https://www.monash.edu/medicine/mchri/pcos/guideline" },
        { title: "RCOG Green-top 33 Long-term consequences of PCOS", url: "https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/long-term-consequences-of-polycystic-ovary-syndrome-green-top-guideline-no-33/" },
      ],
    },
  },
  {
    id: "menopause-hrt",
    name: "Menopause and HRT",
    specialty: "obgyn",
    tags: ["women's health", "HRT", "shared decision"],
    guidelineDate: "2024-11",
    body: {
      presentations: [
        "Vasomotor symptoms (hot flushes, night sweats), irregular periods",
        "Mood change, sleep disturbance, brain fog, joint pains, reduced libido",
        "Genitourinary syndrome: vaginal dryness, dyspareunia, recurrent UTI",
      ],
      redFlags: [
        "Postmenopausal bleeding (≥12 months after LMP) — 2WW endometrial cancer pathway if ≥55",
        "Unscheduled bleeding on HRT persisting >3–6 months after starting or new after established",
        "Breast lump",
        "Premature ovarian insufficiency (<40) — needs confirmation and HRT until natural menopause age",
      ],
      keyHistory: [
        "LMP and pattern, symptoms and impact, contraception",
        "Contraindications: breast/endometrial cancer, VTE, liver disease, undiagnosed vaginal bleeding",
        "VTE risk factors, migraine with aura, CVD risk, smoking, BMI",
        "Patient priorities and preferences",
      ],
      examination: [
        "BP, BMI",
        "Breast/pelvic exam only if clinically indicated",
      ],
      investigations: [
        "Diagnose clinically without lab tests in women >45 with symptoms",
        "FSH (two samples 4–6 weeks apart) if age <40 (POI) and consider if 40–45 with symptoms",
        "Do not use FSH in women on combined hormonal contraception or high-dose progestogen",
      ],
      firstLine: [
        "Explain benefits/risks; HRT is first-line for vasomotor symptoms and low mood related to menopause",
        "Women with uterus: oestrogen + progestogen (cyclical if periods within last 12 months; continuous combined if ≥12 months amenorrhoea or after ≥1 year cyclical)",
        "Women without uterus: oestrogen alone",
        "Transdermal oestrogen if VTE risk, BMI >30, migraine, or as preference",
        "Vaginal oestrogen for genitourinary symptoms (can be used alongside systemic HRT, long-term)",
        "CBT for vasomotor symptoms, sleep and mood",
      ],
      secondLine: [
        "Non-hormonal options if HRT contraindicated/declined: SSRIs/SNRIs (avoid paroxetine/fluoxetine with tamoxifen), clonidine, gabapentin (off-label)",
        "Testosterone (specialist-initiated off-label) for low libido if HRT insufficient",
        "Review 3 months after starting/changing HRT, then annually",
      ],
      referral: [
        "Menopause specialist: treatment ineffective, side effects, contraindications, uncertain diagnosis, POI",
        "2WW gynaecology: postmenopausal bleeding age ≥55",
        "Urgent breast clinic per NG12 for breast symptoms",
      ],
      safetyNetting: [
        "Report unscheduled bleeding, breast changes, calf swelling/chest pain",
        "Contraception still needed: 2 years after LMP if <50, 1 year if ≥50 (until age 55)",
      ],
      thresholds: [
        { label: "Contraception after LMP", value: "<50 years: 2 years; ≥50: 1 year; stop at 55" },
        { label: "Continuous combined HRT", value: "If ≥12 months since LMP" },
        { label: "Estradiol gel example", value: "0.5–1 mg daily (e.g. 1–2 pumps Oestrogel), titrate" },
        { label: "Micronised progesterone (Utrogestan)", value: "200 mg nightly days 15–26 (cyclical) or 100 mg nightly (continuous)" },
      ],
      sources: [
        { title: "NICE NG23 Menopause: identification and management", url: "https://www.nice.org.uk/guidance/ng23" },
        { title: "NICE CKS Menopause", url: "https://cks.nice.org.uk/topics/menopause/" },
        { title: "FSRH Contraception for women aged over 40", url: "https://www.fsrh.org/standards-and-guidance/" },
      ],
    },
  },
];
