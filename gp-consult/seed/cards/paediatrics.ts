import type { SeedCard } from "./types";

export const paediatricsCards: SeedCard[] = [
  {
    id: "bronchiolitis",
    name: "Bronchiolitis",
    specialty: "paediatrics",
    tags: ["respiratory", "infant", "RSV"],
    guidelineDate: "2021-08",
    body: {
      presentations: [
        "Child <2 years (peak 3–6 months) with 1–3 day coryzal prodrome then persistent cough and either tachypnoea/chest recession and either wheeze or crackles",
        "Fever (usually <39°C), poor feeding",
        "Young infants (<6 weeks) may present with apnoea alone",
      ],
      redFlags: [
        "Apnoea (observed or reported)",
        "Child looks seriously unwell to a healthcare professional",
        "Severe respiratory distress: grunting, marked chest recession, RR >70",
        "Central cyanosis",
        "SpO2 persistently <92% in air",
      ],
      keyHistory: [
        "Age, gestation at birth, feeding (% of usual intake), wet nappies in last 12–24 hours",
        "Apnoeas, cyanotic episodes",
        "Risk factors: chronic lung disease (incl. BPD), haemodynamically significant CHD, age <3 months, prematurity (<32 weeks), neuromuscular disorders, immunodeficiency",
        "Household smoking, parental ability to manage at home and distance to hospital",
      ],
      examination: [
        "RR, HR, SpO2, temperature, capillary refill",
        "Work of breathing: nasal flaring, recession, grunting, head bobbing",
        "Auscultation: fine inspiratory crackles and/or high-pitched expiratory wheeze",
        "Hydration status",
      ],
      investigations: [
        "Pulse oximetry in all children with suspected bronchiolitis",
        "No routine blood tests or CXR",
      ],
      firstLine: [
        "Supportive care: small frequent feeds, nasal saline drops if needed",
        "Do NOT use: antibiotics, hypertonic saline, adrenaline, salbutamol, montelukast, ipratropium, systemic/inhaled corticosteroids",
        "Explain natural history: symptoms peak days 3–5, cough resolves within 3 weeks in most",
      ],
      secondLine: [
        "In hospital: supplemental oxygen if SpO2 persistently <92%; NG/OG fluids if cannot take enough orally; CPAP if impending respiratory failure",
        "Prevention: maternal RSV vaccine (from 28 weeks) and infant nirsevimab programme per UKHSA Green Book",
      ],
      referral: [
        "Immediate referral (999): apnoea, seriously unwell, severe respiratory distress (grunting, marked recession, RR >70), central cyanosis, SpO2 <92%",
        "Consider referral: RR >60, difficulty breastfeeding or inadequate oral intake (50–75% of usual), clinical dehydration",
        "Lower threshold for referral with risk factors or social concerns",
      ],
      safetyNetting: [
        "Return if breathing harder (grunting, recession), pauses in breathing, blue lips, feeding less than half usual or no wet nappy for 12 hours, child exhausted",
        "Advise symptoms may worsen up to day 3–5",
      ],
      thresholds: [
        { label: "SpO2 referral threshold", value: "<92% persistently in air" },
        { label: "RR – emergency", value: ">70 breaths/min" },
        { label: "RR – consider referral", value: ">60 breaths/min" },
        { label: "Inadequate intake", value: "50–75% of usual volume or no wet nappy for 12 h" },
      ],
      sources: [
        { title: "NICE NG9 Bronchiolitis in children", url: "https://www.nice.org.uk/guidance/ng9" },
        { title: "NICE CKS Bronchiolitis", url: "https://cks.nice.org.uk/topics/bronchiolitis/" },
        { title: "UKHSA Green Book chapter 27a RSV", url: "https://www.gov.uk/government/publications/respiratory-syncytial-virus-the-green-book-chapter-27a" },
      ],
    },
  },
  {
    id: "febrile-child",
    name: "Fever in under 5s (traffic light)",
    specialty: "paediatrics",
    tags: ["infection", "sepsis", "NG143", "traffic light"],
    guidelineDate: "2021-11",
    body: {
      presentations: [
        "Child under 5 with fever (≥38°C measured or parent-reported)",
        "Common causes: URTI, otitis media, viral illness; serious: UTI, pneumonia, meningitis, sepsis, Kawasaki",
      ],
      redFlags: [
        "RED colour: pale/mottled/ashen/blue skin, lips or tongue",
        "RED activity: no response to social cues, appears ill to HCP, does not wake or if roused does not stay awake, weak high-pitched or continuous cry",
        "RED respiratory: grunting, RR >60, moderate or severe chest indrawing",
        "RED circulation: reduced skin turgor",
        "RED other: age 0–3 months with temp ≥38°C; non-blanching rash; bulging fontanelle; neck stiffness; status epilepticus; focal neurological signs; focal seizures",
      ],
      keyHistory: [
        "Duration of fever (≥5 days → consider Kawasaki), feeding, urine output, activity",
        "Rash, vomiting, diarrhoea, cough, ear pulling, seizures",
        "Immunisation status, travel, sick contacts, PMH, prematurity",
        "Parental concern and ability to cope",
      ],
      examination: [
        "Temperature, HR, RR, CRT, SpO2; assess against traffic-light table",
        "Look for focus: ENT, chest, abdomen, skin (blanching test), joints, fontanelle, meningism",
        "Hydration: mucous membranes, skin turgor, eyes, urine output",
      ],
      investigations: [
        "Urine sample (dipstick/MC&S) if no obvious source",
        "Pulse oximetry",
        "Bloods and blood culture in secondary care for red/amber features",
      ],
      firstLine: [
        "Apply traffic-light system: green → home with safety-net; amber (no diagnosis) → safety-net with face-to-face review or refer; red → urgent paediatric assessment",
        "Antipyretic (paracetamol or ibuprofen) only if the child appears distressed; do not use to prevent febrile seizures",
        "Do not give both simultaneously; consider alternating only if distress persists or recurs before next dose",
        "Do not prescribe oral antibiotics without an apparent source of fever",
        "Suspected meningococcal disease: IM/IV benzylpenicillin without delaying transfer",
      ],
      secondLine: [
        "Fever ≥5 days: assess for Kawasaki disease (conjunctivitis, mucosal changes, rash, extremity changes, lymphadenopathy)",
        "Febrile seizures: first simple seizure — assess, usually refer if first episode",
      ],
      referral: [
        "999 for immediately life-threatening features (compromised airway, breathing, circulation, decreased consciousness)",
        "Urgent face-to-face paediatric assessment (within 2 hours) for any red feature",
        "Amber features without diagnosis: face-to-face assessment and either safety-net or refer per clinical judgement",
        "All infants <3 months with fever ≥38°C → paediatric assessment",
      ],
      safetyNetting: [
        "Verbal and written: return if fit, non-blanching rash, child more unwell, parent more worried, fever ≥5 days, reduced feeding/urine, breathing difficulty",
        "Check the child during the night; keep hydrated",
      ],
      thresholds: [
        { label: "Tachycardia (amber)", value: ">160 (<12 months), >150 (12–24 months), >140 (2–5 years)" },
        { label: "Tachypnoea (amber)", value: "RR >50 (6–12 months), >40 (>12 months)" },
        { label: "SpO2 (amber)", value: "≤95% in air" },
        { label: "CRT (amber)", value: "≥3 seconds" },
        { label: "Age-temperature red/amber", value: "0–3 months ≥38°C red; 3–6 months ≥39°C amber" },
        { label: "Benzylpenicillin pre-hospital", value: "<1 yr 300 mg; 1–9 yrs 600 mg; ≥10 yrs 1.2 g (IM/IV)" },
        { label: "Paracetamol", value: "15 mg/kg per dose (max 4 doses/24 h) — use BNFc age-band doses" },
      ],
      sources: [
        { title: "NICE NG143 Fever in under 5s", url: "https://www.nice.org.uk/guidance/ng143" },
        { title: "NICE NG143 traffic light table", url: "https://www.nice.org.uk/guidance/ng143/resources/support-for-education-and-learning-educational-resource-traffic-light-table-pdf-6960664333" },
        { title: "BNFc Benzylpenicillin", url: "https://bnfc.nice.org.uk/drugs/benzylpenicillin-sodium/" },
      ],
    },
  },
  {
    id: "childhood-uti",
    name: "Urinary tract infection in under 16s",
    specialty: "paediatrics",
    tags: ["infection", "antimicrobial", "imaging"],
    guidelineDate: "2022-07",
    body: {
      presentations: [
        "Infants: fever, vomiting, lethargy, irritability, poor feeding, faltering growth, jaundice (neonates)",
        "Older children: dysuria, frequency, abdominal/loin pain, new wetting, haematuria, fever",
      ],
      redFlags: [
        "Age <3 months with suspected UTI",
        "Signs of sepsis or serious illness (NG143 red features)",
        "Atypical UTI: poor urine flow, abdominal/bladder mass, raised creatinine, septicaemia, failure to respond within 48 h, non-E. coli organism",
      ],
      keyHistory: [
        "Fever, urinary symptoms, previous UTIs, constipation, voiding dysfunction",
        "Antenatal renal abnormalities, family history of VUR/renal disease",
        "Poor growth, hypertension",
      ],
      examination: [
        "Temperature, HR, RR, CRT, BP",
        "Abdomen: loin tenderness, palpable bladder/kidney; spine and external genitalia",
        "Growth (plot on centile chart)",
      ],
      investigations: [
        "Urine sample in infants/children with unexplained fever ≥38°C or symptoms of UTI (clean catch preferred)",
        "Under 3 months: urgent microscopy and culture",
        "3 months–under 3 years: urgent microscopy and culture where possible; dipstick if not",
        "3 years and older: dipstick (leucocyte esterase and nitrite) to guide treatment; send culture if upper UTI, high risk, or mismatch",
        "Imaging (USS/DMSA/MCUG) per age, response and atypical/recurrent features",
      ],
      firstLine: [
        "<3 months: refer immediately to paediatrics (parenteral antibiotics)",
        "≥3 months with lower UTI: trimethoprim or nitrofurantoin for 3 days (amoxicillin or cefalexin if sensitive)",
        "≥3 months with upper UTI/pyelonephritis: consider paediatric referral; oral cefalexin or co-amoxiclav for 7–10 days (BNFc doses)",
      ],
      secondLine: [
        "Recurrent UTI: assess bladder/bowel dysfunction, constipation; consider prophylaxis only on specialist advice",
        "USS within 6 weeks for infants <6 months with first UTI responding to treatment; during acute infection if atypical",
      ],
      referral: [
        "Immediate paediatric referral: age <3 months, or any child with serious illness features",
        "Consider paediatric referral for upper UTI in ≥3 months",
        "Refer for imaging/paediatric review: recurrent UTI, atypical UTI",
      ],
      safetyNetting: [
        "Return if no improvement in 24–48 hours, fever persists, vomiting, child becomes more unwell",
        "Advise on hydration, avoid constipation, regular voiding",
      ],
      thresholds: [
        { label: "Trimethoprim (lower UTI, BNFc)", value: "6 months–5 years 50 mg BD; 6–11 years 100 mg BD; 12–15 years 200 mg BD — 3 days" },
        { label: "Nitrofurantoin (lower UTI, BNFc)", value: "3 months–11 years 750 micrograms/kg QDS; 12–15 years 50 mg QDS — 3 days" },
        { label: "Upper UTI duration", value: "7–10 days oral" },
      ],
      sources: [
        { title: "NICE NG224 UTI in under 16s: diagnosis and management", url: "https://www.nice.org.uk/guidance/ng224" },
        { title: "NICE CKS UTI – children", url: "https://cks.nice.org.uk/topics/urinary-tract-infection-children/" },
        { title: "BNFc Trimethoprim", url: "https://bnfc.nice.org.uk/drugs/trimethoprim/" },
      ],
    },
  },
];
