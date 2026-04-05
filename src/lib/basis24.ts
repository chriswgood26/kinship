// BASIS-24 — Behavior and Symptom Identification Scale
// Eisen, Normand, Belanger, Spiro & Esch (2004), McLean Hospital
// Self-report measure of behavioral health symptoms and functioning
// 24 items rated 0–4; score = mean of answered items (range 0.0–4.0)

export const BASIS24 = {
  id: "basis24",
  name: "BASIS-24",
  fullName: "Behavior and Symptom Identification Scale — 24",
  description: "Behavioral health outcomes self-report measure (McLean Hospital)",
  instructions:
    "During the past week, how much have you been bothered by the following problems? (0 = Not at all, 1 = A little, 2 = Moderately, 3 = Quite a bit, 4 = Extremely)",
  minScore: 0,
  maxScore: 4, // mean-based, 0.0–4.0
  source: "Eisen et al., 2004 — McLean Hospital. Public domain.",

  ratingOptions: [
    { value: 0, label: "Not at all" },
    { value: 1, label: "A little" },
    { value: 2, label: "Moderately" },
    { value: 3, label: "Quite a bit" },
    { value: 4, label: "Extremely" },
  ],

  questions: [
    // Depression / Functioning
    { id: "q1",  text: "Feeling sad or depressed",                                  subscale: "depression" },
    { id: "q2",  text: "Feeling hopeless about the future",                         subscale: "depression" },
    { id: "q3",  text: "Feeling worthless or inferior to others",                   subscale: "depression" },
    { id: "q4",  text: "Getting too little done during the day",                    subscale: "depression" },
    { id: "q5",  text: "Having little or no interest in things you used to enjoy",  subscale: "depression" },
    { id: "q6",  text: "Feeling like you have no energy",                           subscale: "depression" },
    // Relationships
    { id: "q7",  text: "Having problems in your relationship with family members",  subscale: "relationships" },
    { id: "q8",  text: "Having problems in relationships with people outside family", subscale: "relationships" },
    { id: "q9",  text: "Feeling isolated or distant from other people",             subscale: "relationships" },
    // Self-Harm
    { id: "q10", text: "Thinking about ending your life",                           subscale: "selfharm" },
    { id: "q11", text: "Hurting yourself intentionally",                            subscale: "selfharm" },
    // Emotional Lability
    { id: "q12", text: "Feeling restless or unable to sit still",                   subscale: "emotional" },
    { id: "q13", text: "Feeling angry or having violent urges toward others",       subscale: "emotional" },
    { id: "q14", text: "Feeling tense and unable to relax",                         subscale: "emotional" },
    // Psychosis
    { id: "q15", text: "Hearing voices or seeing things other people don't",        subscale: "psychosis" },
    { id: "q16", text: "Having thoughts that others would find bizarre or strange",  subscale: "psychosis" },
    { id: "q17", text: "Feeling controlled by forces outside yourself",             subscale: "psychosis" },
    { id: "q18", text: "Feeling confused or having trouble thinking clearly",       subscale: "psychosis" },
    // Substance Abuse
    { id: "q19", text: "Having problems with alcohol",                              subscale: "substance" },
    { id: "q20", text: "Having problems with drugs",                                subscale: "substance" },
    // General functioning
    { id: "q21", text: "Sleeping too much or too little",                           subscale: "general" },
    { id: "q22", text: "Eating too much or too little",                             subscale: "general" },
    { id: "q23", text: "Feeling like your problems are beyond your control",        subscale: "general" },
    { id: "q24", text: "Feeling overwhelmed by daily responsibilities",             subscale: "general" },
  ],

  subscales: [
    { id: "depression",    label: "Depression / Functioning",  color: "bg-blue-100 text-blue-800",    items: ["q1","q2","q3","q4","q5","q6"] },
    { id: "relationships", label: "Relationships",             color: "bg-purple-100 text-purple-800", items: ["q7","q8","q9"] },
    { id: "selfharm",      label: "Self-Harm",                 color: "bg-red-100 text-red-800",       items: ["q10","q11"] },
    { id: "emotional",     label: "Emotional Lability",        color: "bg-orange-100 text-orange-800", items: ["q12","q13","q14"] },
    { id: "psychosis",     label: "Psychosis",                 color: "bg-violet-100 text-violet-800", items: ["q15","q16","q17","q18"] },
    { id: "substance",     label: "Substance Use",             color: "bg-amber-100 text-amber-800",   items: ["q19","q20"] },
    { id: "general",       label: "General Functioning",       color: "bg-slate-100 text-slate-700",   items: ["q21","q22","q23","q24"] },
  ],

  // Severity thresholds based on mean score (0.0–4.0)
  severity: [
    { max: 0.9,  label: "Low",               color: "bg-emerald-100 text-emerald-700", recommendation: "Minimal symptom burden; routine monitoring appropriate" },
    { max: 1.9,  label: "Mild to Moderate",  color: "bg-blue-100 text-blue-700",       recommendation: "Some distress present; review clinical priorities and support needs" },
    { max: 2.9,  label: "Moderate to Severe", color: "bg-amber-100 text-amber-700",    recommendation: "Significant symptom burden; review treatment plan and level of care" },
    { max: 4.0,  label: "Severe",            color: "bg-red-100 text-red-700",         recommendation: "High symptom severity; urgent clinical review and intensified support indicated" },
  ],
};

/** Compute mean score across all answered items. Returns 0 if no answers. */
export function getBasis24Score(answers: Record<string, number>): number {
  const vals = BASIS24.questions
    .map(q => answers[q.id])
    .filter((v): v is number => typeof v === "number");
  if (!vals.length) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(mean * 100) / 100;
}

/** Compute mean score for a specific subscale. */
export function getSubscaleScore(answers: Record<string, number>, subscaleId: string): number | null {
  const sub = BASIS24.subscales.find(s => s.id === subscaleId);
  if (!sub) return null;
  const vals = sub.items
    .map(id => answers[id])
    .filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(mean * 100) / 100;
}

export function getBasis24Severity(score: number) {
  return BASIS24.severity.find(s => score <= s.max) || BASIS24.severity[BASIS24.severity.length - 1];
}

/** True if either self-harm item is endorsed (> 0). */
export function hasSelfHarmFlag(answers: Record<string, number>): boolean {
  return (answers["q10"] || 0) > 0 || (answers["q11"] || 0) > 0;
}
