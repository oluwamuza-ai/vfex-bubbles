import type { SeedCard } from "./types";

export const surgeryCards: SeedCard[] = [
  {
    id: "acute-abdomen-appendicitis",
    name: "Acute abdomen / appendicitis",
    specialty: "surgery",
    tags: ["acute", "emergency", "abdominal pain"],
    guidelineDate: "2020-11",
    body: {
      presentations: [
        "Periumbilical pain migrating to the right iliac fossa over 12–24 hours",
        "Anorexia, nausea/vomiting, low-grade fever",
        "Atypical: retrocaecal (flank/back pain), pelvic (diarrhoea, urinary symptoms), elderly and pregnant presentations",
        "Children: may present with vomiting and irritability; higher perforation rates in under-5s",
      ],
      redFlags: [
        "Peritonism: guarding, rigidity, rebound, percussion tenderness (perforation)",
        "Sepsis/shock: tachycardia, hypotension, mottling",
        "Positive pregnancy test with abdominal pain (exclude ectopic)",
        "Elderly with pain out of proportion to signs (mesenteric ischaemia), pulsatile mass (AAA)",
      ],
      keyHistory: [
        "Onset, site, migration, character, progression; relation to food/movement",
        "Vomiting, bowel habit, urinary symptoms",
        "LMP, possibility of pregnancy, vaginal discharge/bleeding (gynaecological causes)",
        "Previous abdominal surgery, anticoagulants",
      ],
      examination: [
        "Obs: temperature, HR, BP, RR",
        "RIF tenderness at McBurney's point; Rovsing's sign; psoas and obturator signs",
        "Guarding, rebound, percussion tenderness",
        "Hernial orifices; testes in boys/men (torsion)",
      ],
      investigations: [
        "Urine pregnancy test in all people who could be pregnant",
        "Urine dipstick (may show leucocytes/blood in appendicitis — do not falsely reassure)",
        "Capillary glucose; bloods (FBC, CRP) in hospital",
        "Imaging (USS/CT) in secondary care",
      ],
      firstLine: [
        "Suspected appendicitis: refer immediately (same-day) to acute surgical team",
        "Do not give antibiotics in primary care before surgical assessment unless directed",
        "Analgesia is appropriate and does not mask diagnosis; keep nil by mouth if referring",
      ],
      secondLine: [
        "Uncertain diagnosis with mild symptoms: arrange review within hours (active observation) with clear safety-netting",
        "Secondary care: appendicectomy (laparoscopic) or antibiotic-first management in selected uncomplicated cases",
      ],
      referral: [
        "Same-day acute surgical referral for suspected appendicitis",
        "999 if peritonitis, shock, or suspected ruptured AAA/ectopic",
        "Children: same-day paediatric surgical assessment",
      ],
      safetyNetting: [
        "If sent home: return immediately if pain worsens/localises to RIF, vomiting, fever, unable to walk upright",
        "Specific review time (e.g. within 4–6 hours or next morning)",
      ],
      thresholds: [
        { label: "Alvarado score", value: "≥7 high probability; ≤4 low probability (adults)" },
        { label: "Referral urgency", value: "Same-day acute surgical assessment" },
      ],
      sources: [
        { title: "NICE CKS Appendicitis", url: "https://cks.nice.org.uk/topics/appendicitis/" },
      ],
    },
  },
  {
    id: "low-back-pain",
    name: "Low back pain and sciatica",
    specialty: "surgery",
    tags: ["musculoskeletal", "red flags", "cauda equina"],
    guidelineDate: "2020-12",
    body: {
      presentations: [
        "Non-specific mechanical low back pain, worse with movement, better with rest",
        "Sciatica: radicular leg pain below the knee in dermatomal distribution ± paraesthesia/weakness",
      ],
      redFlags: [
        "Cauda equina: saddle anaesthesia, bladder retention/incontinence, faecal incontinence, bilateral sciatica, sexual dysfunction, perianal numbness",
        "Malignancy: history of cancer, unexplained weight loss, age >50 new onset, thoracic pain, night pain, progressive pain",
        "Infection: fever, IV drug use, immunosuppression, recent spinal procedure, TB exposure",
        "Fracture: osteoporosis, long-term steroids, significant trauma, age >70",
        "Progressive neurological deficit; inflammatory features (morning stiffness >30 min, age <40, improves with exercise → axial SpA)",
        "AAA in older men with back pain and pulsatile mass",
      ],
      keyHistory: [
        "Onset, mechanism, duration, radiation below knee",
        "Bladder, bowel and sexual function; saddle sensation",
        "Systemic symptoms, cancer history, steroid use",
        "Psychosocial factors (yellow flags): fear avoidance, low mood, work issues",
      ],
      examination: [
        "Spinal inspection, palpation, range of movement",
        "Straight leg raise; lower limb neurology (power, reflexes, sensation, dermatomes)",
        "Saddle sensation; consider PR exam for anal tone if CES suspected (or refer)",
        "Abdominal exam for AAA in older patients",
      ],
      investigations: [
        "No imaging in primary care for non-specific low back pain",
        "Urgent bloods (FBC, ESR/CRP, bone profile, PSA, myeloma screen) if malignancy/infection suspected",
        "Bladder scan for post-void residual if CES suspected (in secondary care — don't delay referral)",
      ],
      firstLine: [
        "Risk stratify (STarT Back tool) to guide management",
        "Self-management: stay active, continue normal activities, return to work",
        "Oral NSAID at lowest effective dose for shortest period (with PPI if indicated)",
        "Do not offer paracetamol alone; weak opioid ± paracetamol only for acute pain if NSAID contraindicated",
        "Group exercise programme; consider manual therapy as part of package with exercise",
      ],
      secondLine: [
        "Sciatica: do not offer gabapentinoids, other antiepileptics, oral corticosteroids or benzodiazepines; consider neuropathic agents per NG173 cautiously only if other options fail",
        "Psychological therapies (CBT) within a combined physical and psychological programme",
        "Refer to MSK/spinal services if symptoms persist or radicular pain not improving at 6 weeks",
      ],
      referral: [
        "Emergency same-day (A&E/on-call spinal) for suspected cauda equina syndrome",
        "Suspected spinal metastases/MSCC: same-day discussion with MSCC coordinator if neurological symptoms",
        "Urgent referral for suspected infection or fracture",
        "Rheumatology if axial spondyloarthritis suspected",
      ],
      safetyNetting: [
        "Give written CES safety-net card: attend A&E immediately with numbness between legs, difficulty passing/controlling urine or stool, sexual dysfunction, bilateral leg symptoms",
        "Review if pain not improving in 4–6 weeks or new symptoms",
      ],
      thresholds: [
        { label: "Naproxen", value: "250–500 mg BD (with PPI if indicated)" },
        { label: "Ibuprofen", value: "400 mg TDS" },
        { label: "Persistent sciatica referral", value: "No improvement after ~6 weeks of conservative management" },
      ],
      sources: [
        { title: "NICE NG59 Low back pain and sciatica in over 16s", url: "https://www.nice.org.uk/guidance/ng59" },
        { title: "NICE CKS Back pain – low (without radiculopathy)", url: "https://cks.nice.org.uk/topics/back-pain-low-without-radiculopathy/" },
        { title: "NICE CKS Sciatica (lumbar radiculopathy)", url: "https://cks.nice.org.uk/topics/sciatica-lumbar-radiculopathy/" },
      ],
    },
  },
  {
    id: "rectal-bleeding-colorectal",
    name: "Rectal bleeding / suspected colorectal cancer",
    specialty: "surgery",
    tags: ["cancer", "NG12", "FIT", "2WW"],
    guidelineDate: "2023-08",
    body: {
      presentations: [
        "Rectal bleeding, change in bowel habit, abdominal pain, weight loss",
        "Iron-deficiency anaemia, abdominal or rectal mass",
        "Benign causes: haemorrhoids, anal fissure (bright red on paper, painful defecation)",
      ],
      redFlags: [
        "Abdominal or rectal mass",
        "Unexplained weight loss, iron-deficiency anaemia",
        "Change in bowel habit in ≥60s",
        "Anal mass or ulceration",
        "Signs of obstruction: vomiting, absolute constipation, distension",
      ],
      keyHistory: [
        "Bleeding character: mixed with stool vs on paper; dark vs bright",
        "Change in bowel habit duration, tenesmus, mucus",
        "Weight loss, fatigue, abdominal pain",
        "FHx bowel cancer/polyps/Lynch, IBD history, bowel screening participation",
      ],
      examination: [
        "Abdominal examination for masses, hepatomegaly",
        "Digital rectal examination (rectal mass) and anal inspection",
        "Pallor, BMI",
      ],
      investigations: [
        "FIT (faecal immunochemical test) for adults with signs/symptoms of colorectal cancer (DG56)",
        "FBC (iron-deficiency anaemia), ferritin",
        "Do not delay referral for FIT if rectal/abdominal mass or anal ulceration",
      ],
      firstLine: [
        "Refer via suspected cancer pathway (2WW) if FIT ≥10 µg Hb/g faeces",
        "Refer via suspected cancer pathway if rectal or abdominal mass, unexplained anal mass or anal ulceration",
        "If FIT <10 with ongoing concern, consider safety-netting, repeat assessment or non-urgent referral",
        "Treat benign causes (haemorrhoids: fibre, fluids, topical agents; fissure: laxatives, topical GTN/diltiazem)",
      ],
      secondLine: [
        "Persistent symptoms with negative FIT: discuss with specialist/routine referral rather than repeated reassurance",
        "Iron-deficiency anaemia in men or postmenopausal women: investigate GI tract (2WW per local pathway)",
      ],
      referral: [
        "NG12/DG56: suspected cancer pathway referral if FIT ≥10 µg Hb/g",
        "Suspected cancer pathway for rectal or abdominal mass; anal mass/ulceration",
        "Emergency admission for bowel obstruction or significant haemodynamic bleeding",
      ],
      safetyNetting: [
        "Return if bleeding increases, symptoms persist despite negative FIT, new weight loss or anaemia symptoms",
        "Encourage participation in national bowel screening",
      ],
      thresholds: [
        { label: "FIT threshold for referral", value: "≥10 µg Hb/g faeces" },
        { label: "NG12 (historic age criteria, now FIT-guided)", value: "≥40 weight loss + abdo pain; ≥50 rectal bleeding; ≥60 IDA or change in bowel habit" },
      ],
      sources: [
        { title: "NICE DG56 FIT to guide colorectal cancer pathway referral", url: "https://www.nice.org.uk/guidance/dg56" },
        { title: "NICE NG12 Suspected cancer: recognition and referral", url: "https://www.nice.org.uk/guidance/ng12" },
        { title: "NICE CKS Gastrointestinal tract (lower) cancers", url: "https://cks.nice.org.uk/topics/gastrointestinal-tract-lower-cancers-recognition-referral/" },
      ],
    },
  },
];
