// SDOH Screening — Social Determinants of Health
// Based on the CMS Accountable Health Communities (AHC) HRSN Screening Tool
// Covers 5 core domains: Housing, Food, Transportation, Utilities, Safety
// Plus supplemental domains: Financial, Employment, Social Support

export interface SDOHQuestion {
  id: string;
  domain: string;
  domainColor: string;
  text: string;
}

export const SDOH = {
  id: "sdoh",
  name: "SDOH",
  fullName: "Social Determinants of Health Screening",
  description: "Identifies unmet social needs across housing, food, transportation, and other key domains",
  instructions:
    "The following questions help us understand social factors that may affect your health and wellbeing. There are no right or wrong answers. Your responses will help us connect you to community resources.",
  maxScore: 10,

  questions: [
    // Housing domain
    {
      id: "q1",
      domain: "Housing",
      domainColor: "text-blue-600",
      text: "Are you worried about losing your housing in the next 2 months?",
    },
    {
      id: "q2",
      domain: "Housing",
      domainColor: "text-blue-600",
      text: "In the past 12 months, have you stayed in a shelter, car, or other place not meant for sleeping?",
    },
    // Food domain
    {
      id: "q3",
      domain: "Food",
      domainColor: "text-amber-600",
      text: "In the past 12 months, have you worried that your food would run out before you had money to buy more?",
    },
    {
      id: "q4",
      domain: "Food",
      domainColor: "text-amber-600",
      text: "In the past 12 months, did the food you bought not last and you didn't have money to get more?",
    },
    // Transportation
    {
      id: "q5",
      domain: "Transportation",
      domainColor: "text-indigo-600",
      text: "In the past 12 months, has lack of transportation kept you from medical appointments, work, or getting things needed for daily living?",
    },
    // Utilities
    {
      id: "q6",
      domain: "Utilities",
      domainColor: "text-orange-600",
      text: "In the past 12 months, have you been unable to pay utility bills (electricity, gas, water) when they were due?",
    },
    // Safety
    {
      id: "q7",
      domain: "Safety",
      domainColor: "text-red-600",
      text: "Do you feel unsafe in your home or immediate neighborhood?",
    },
    // Financial strain
    {
      id: "q8",
      domain: "Financial",
      domainColor: "text-emerald-600",
      text: "In the past 12 months, have you had difficulty making ends meet or meeting basic financial needs?",
    },
    // Employment
    {
      id: "q9",
      domain: "Employment",
      domainColor: "text-violet-600",
      text: "Are you currently unemployed and looking for work?",
    },
    // Social support
    {
      id: "q10",
      domain: "Social Support",
      domainColor: "text-pink-600",
      text: "Do you often feel lonely or like you lack people to count on for support?",
    },
  ] as SDOHQuestion[],

  domains: [
    { name: "Housing", questions: ["q1", "q2"], icon: "🏠", color: "bg-blue-50 border-blue-200 text-blue-800" },
    { name: "Food", questions: ["q3", "q4"], icon: "🍎", color: "bg-amber-50 border-amber-200 text-amber-800" },
    { name: "Transportation", questions: ["q5"], icon: "🚌", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { name: "Utilities", questions: ["q6"], icon: "💡", color: "bg-orange-50 border-orange-200 text-orange-800" },
    { name: "Safety", questions: ["q7"], icon: "🛡️", color: "bg-red-50 border-red-200 text-red-800" },
    { name: "Financial", questions: ["q8"], icon: "💰", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    { name: "Employment", questions: ["q9"], icon: "💼", color: "bg-violet-50 border-violet-200 text-violet-800" },
    { name: "Social Support", questions: ["q10"], icon: "🤝", color: "bg-pink-50 border-pink-200 text-pink-800" },
  ],

  severity: [
    {
      max: 0,
      label: "No Needs Identified",
      color: "bg-emerald-100 text-emerald-700",
      recommendation:
        "No unmet social needs identified at this time. Re-screen at next annual visit or upon significant life change.",
    },
    {
      max: 2,
      label: "Low Need",
      color: "bg-blue-100 text-blue-700",
      recommendation:
        "1–2 unmet social needs identified. Provide information about relevant community resources and document in care plan.",
    },
    {
      max: 5,
      label: "Moderate Need",
      color: "bg-amber-100 text-amber-700",
      recommendation:
        "3–5 unmet needs identified. Warm referral to community health worker or social work services. Address highest-priority needs in treatment planning.",
    },
    {
      max: 10,
      label: "High Need",
      color: "bg-red-100 text-red-700",
      recommendation:
        "6+ unmet needs identified. Immediate social work consultation recommended. Develop a comprehensive social needs action plan with community navigation support.",
    },
  ],
};

export function getSDOHScore(answers: Record<string, boolean | null>): number {
  return SDOH.questions.reduce((sum, q) => sum + (answers[q.id] === true ? 1 : 0), 0);
}

export function getSDOHSeverity(score: number) {
  return SDOH.severity.find(s => score <= s.max) || SDOH.severity[SDOH.severity.length - 1];
}

export function getSDOHDomainNeeds(answers: Record<string, boolean | null>) {
  return SDOH.domains
    .map(domain => ({
      ...domain,
      needCount: domain.questions.filter(qid => answers[qid] === true).length,
      hasNeed: domain.questions.some(qid => answers[qid] === true),
    }))
    .filter(d => d.hasNeed);
}
