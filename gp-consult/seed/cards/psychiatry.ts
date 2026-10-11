import type { SeedCard } from "./types";

export const psychiatryCards: SeedCard[] = [
  {
    id: "depression",
    name: "Depression in adults",
    specialty: "psychiatry",
    tags: ["mental health", "suicide risk", "antidepressants"],
    guidelineDate: "2022-06",
    body: {
      presentations: [
        "Persistent low mood and/or anhedonia for ≥2 weeks",
        "Sleep and appetite change, fatigue, poor concentration, guilt/worthlessness, psychomotor change, suicidal thoughts",
        "Somatic presentations: tiredness, aches, insomnia",
      ],
      redFlags: [
        "Active suicidal ideation with plan, intent or recent attempt",
        "Psychotic features (delusions, hallucinations)",
        "Severe self-neglect, inability to eat/drink",
        "Bipolar features: history of mania/hypomania (antidepressant monotherapy may precipitate mania)",
        "Safeguarding concerns (children, vulnerable adults, domestic abuse)",
      ],
      keyHistory: [
        "Core symptoms, duration, severity (PHQ-9), functional impact",
        "Suicide: thoughts, plans, intent, means, protective factors, previous attempts — ask directly",
        "Alcohol/drug use; physical causes (hypothyroidism, anaemia, medications such as isotretinoin, beta-blockers)",
        "Previous episodes and treatment response, mania history, FHx",
        "Social support, stressors, employment, safeguarding",
      ],
      examination: [
        "Mental state examination: appearance, behaviour, speech, mood, affect, thought, perception, cognition, insight",
        "Physical health check as appropriate",
      ],
      investigations: [
        "Bloods if clinically indicated: FBC, TFT, U&E, LFT, HbA1c, B12/folate",
        "PHQ-9 to aid severity classification (less severe <16, more severe ≥16)",
      ],
      firstLine: [
        "Less severe depression: guided self-help, group CBT/BA, individual CBT/BA, IPT, counselling, short psychodynamic therapy; antidepressant not routinely first-line unless preferred",
        "More severe depression: combination of individual CBT and an antidepressant (preferred), or individual CBT/BA, or antidepressant alone",
        "SSRI first-line (e.g. sertraline 50 mg OD)",
        "Self-refer to NHS Talking Therapies",
        "Review within 2 weeks of starting antidepressant; within 1 week if 18–25 or increased suicide risk",
      ],
      secondLine: [
        "Inadequate response at 4 weeks (or 6–8 if partial): check adherence, increase dose, switch (another SSRI, mirtazapine, SNRI), or add psychological therapy",
        "Continue antidepressant for at least 6 months after remission (longer if recurrent)",
        "Taper gradually to avoid discontinuation symptoms",
        "Citalopram max 20 mg in >65s (QT prolongation); co-prescribe PPI with SSRI if on NSAID/anticoagulant in older people",
      ],
      referral: [
        "Same-day crisis/mental health team: active suicidal intent/plan, psychosis, severe self-neglect",
        "Urgent secondary care referral: suspected bipolar disorder, treatment-resistant depression, significant comorbidity",
        "Do not use risk assessment tools/scores alone to predict suicide or decide on treatment",
      ],
      safetyNetting: [
        "Crisis plan: Samaritans 116 123, NHS 111 (mental health option), 999/A&E if immediate danger",
        "Warn about early agitation/suicidal thoughts on starting antidepressants, and that benefit takes 2–4 weeks",
        "Limit quantities prescribed if overdose risk",
      ],
      thresholds: [
        { label: "PHQ-9 less vs more severe", value: "<16 less severe; ≥16 more severe" },
        { label: "Sertraline", value: "50 mg OD, increase in 50 mg steps at ≥1-week intervals, max 200 mg" },
        { label: "Citalopram max (>65)", value: "20 mg OD" },
        { label: "Continue after remission", value: "At least 6 months" },
      ],
      sources: [
        { title: "NICE NG222 Depression in adults", url: "https://www.nice.org.uk/guidance/ng222" },
        { title: "NICE NG225 Self-harm", url: "https://www.nice.org.uk/guidance/ng225" },
        { title: "NICE CKS Depression", url: "https://cks.nice.org.uk/topics/depression/" },
      ],
    },
  },
  {
    id: "gad",
    name: "Generalised anxiety disorder",
    specialty: "psychiatry",
    tags: ["mental health", "stepped care", "anxiety"],
    guidelineDate: "2020-07",
    body: {
      presentations: [
        "Excessive, difficult-to-control worry about multiple everyday matters for ≥6 months",
        "Restlessness, fatigue, poor concentration, irritability, muscle tension, sleep disturbance",
        "Somatic presentations: palpitations, GI upset, headaches",
      ],
      redFlags: [
        "Suicidal ideation, especially with comorbid depression or substance misuse",
        "Physical causes: hyperthyroidism, arrhythmia, phaeochromocytoma, hypoglycaemia",
        "Alcohol/benzodiazepine dependence, withdrawal",
      ],
      keyHistory: [
        "Worry content, duration, control, functional impact (GAD-7)",
        "Panic attacks, phobias, OCD, PTSD features; depression screen",
        "Caffeine, alcohol, drug use; prescribed and OTC medicines",
        "Previous treatments, preferences",
      ],
      examination: [
        "Mental state examination",
        "Pulse, BP, thyroid examination, tremor",
      ],
      investigations: [
        "TFT and others if physical cause suspected",
        "GAD-7 ≥10 suggests probable GAD",
      ],
      firstLine: [
        "Step 1: identification, education about GAD and treatment options, active monitoring",
        "Step 2: low-intensity psychological interventions — individual non-facilitated or guided self-help, psychoeducational groups (NHS Talking Therapies)",
        "Step 3 (marked functional impairment or no response): high-intensity CBT or applied relaxation, or drug treatment",
        "Drug: sertraline first-line (off-label for GAD but cost-effective)",
      ],
      secondLine: [
        "If sertraline ineffective: alternative SSRI or SNRI (escitalopram, paroxetine, duloxetine, venlafaxine)",
        "Pregabalin if SSRIs/SNRIs not tolerated (note misuse potential, controlled drug)",
        "Do not offer benzodiazepines except short-term in crisis; do not offer antipsychotics in primary care",
        "Review 1 week after starting (if <30 or suicide risk), otherwise 2 weeks, then every 2–4 weeks for 3 months",
      ],
      referral: [
        "Step 4 specialist mental health referral: risk of self-harm/suicide, significant comorbidity, self-neglect, inadequate response to step 3",
        "Same-day crisis team if acute suicide risk",
      ],
      safetyNetting: [
        "Explain SSRI side effects including initial anxiety increase and suicidal thoughts in young adults",
        "Crisis contacts and when to seek urgent help",
      ],
      thresholds: [
        { label: "GAD-7 probable GAD", value: "≥10 (≥15 severe)" },
        { label: "Sertraline", value: "25–50 mg OD start, titrate to max 200 mg" },
        { label: "Pregabalin (GAD)", value: "150 mg/day in 2–3 divided doses, max 600 mg/day" },
      ],
      sources: [
        { title: "NICE CG113 Generalised anxiety disorder and panic disorder", url: "https://www.nice.org.uk/guidance/cg113" },
        { title: "NICE CKS Generalized anxiety disorder", url: "https://cks.nice.org.uk/topics/generalized-anxiety-disorder/" },
      ],
    },
  },
];
