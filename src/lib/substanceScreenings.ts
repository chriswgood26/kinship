// AUDIT — Alcohol Use Disorders Identification Test (10-item)
// Developed by the World Health Organization (WHO)

export const AUDIT = {
  id: "audit",
  name: "AUDIT",
  fullName: "Alcohol Use Disorders Identification Test",
  description: "Alcohol use screening (WHO)",
  instructions: "Please answer the following questions about your use of alcoholic beverages over the past year.",
  maxScore: 40,

  questions: [
    {
      id: "q1",
      text: "How often do you have a drink containing alcohol?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Monthly or less" },
        { value: 2, label: "2–4 times a month" },
        { value: 3, label: "2–3 times a week" },
        { value: 4, label: "4 or more times a week" },
      ],
    },
    {
      id: "q2",
      text: "How many drinks containing alcohol do you have on a typical day when you are drinking?",
      options: [
        { value: 0, label: "1 or 2" },
        { value: 1, label: "3 or 4" },
        { value: 2, label: "5 or 6" },
        { value: 3, label: "7, 8, or 9" },
        { value: 4, label: "10 or more" },
      ],
    },
    {
      id: "q3",
      text: "How often do you have six or more drinks on one occasion?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Less than monthly" },
        { value: 2, label: "Monthly" },
        { value: 3, label: "Weekly" },
        { value: 4, label: "Daily or almost daily" },
      ],
    },
    {
      id: "q4",
      text: "How often during the last year have you found that you were not able to stop drinking once you had started?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Less than monthly" },
        { value: 2, label: "Monthly" },
        { value: 3, label: "Weekly" },
        { value: 4, label: "Daily or almost daily" },
      ],
    },
    {
      id: "q5",
      text: "How often during the last year have you failed to do what was normally expected of you because of drinking?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Less than monthly" },
        { value: 2, label: "Monthly" },
        { value: 3, label: "Weekly" },
        { value: 4, label: "Daily or almost daily" },
      ],
    },
    {
      id: "q6",
      text: "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Less than monthly" },
        { value: 2, label: "Monthly" },
        { value: 3, label: "Weekly" },
        { value: 4, label: "Daily or almost daily" },
      ],
    },
    {
      id: "q7",
      text: "How often during the last year have you had a feeling of guilt or remorse after drinking?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Less than monthly" },
        { value: 2, label: "Monthly" },
        { value: 3, label: "Weekly" },
        { value: 4, label: "Daily or almost daily" },
      ],
    },
    {
      id: "q8",
      text: "How often during the last year have you been unable to remember what happened the night before because of your drinking?",
      options: [
        { value: 0, label: "Never" },
        { value: 1, label: "Less than monthly" },
        { value: 2, label: "Monthly" },
        { value: 3, label: "Weekly" },
        { value: 4, label: "Daily or almost daily" },
      ],
    },
    {
      id: "q9",
      text: "Have you or someone else been injured as a result of your drinking?",
      options: [
        { value: 0, label: "No" },
        { value: 2, label: "Yes, but not in the last year" },
        { value: 4, label: "Yes, during the last year" },
      ],
    },
    {
      id: "q10",
      text: "Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?",
      options: [
        { value: 0, label: "No" },
        { value: 2, label: "Yes, but not in the last year" },
        { value: 4, label: "Yes, during the last year" },
      ],
    },
  ],

  severity: [
    {
      max: 7,
      label: "Low Risk",
      color: "bg-emerald-100 text-emerald-700",
      recommendation: "No intervention required. Reinforce positive behavior; provide alcohol education as appropriate.",
    },
    {
      max: 15,
      label: "Hazardous Use",
      color: "bg-amber-100 text-amber-700",
      recommendation: "Simple advice. Discuss drinking patterns; provide brief motivational counseling and monitor.",
    },
    {
      max: 19,
      label: "Harmful Use",
      color: "bg-orange-100 text-orange-700",
      recommendation: "Brief counseling and continued monitoring. Consider referral to a substance use specialist.",
    },
    {
      max: 40,
      label: "Likely Dependence",
      color: "bg-red-100 text-red-700",
      recommendation: "Refer to specialist for diagnostic evaluation and treatment of alcohol use disorder.",
    },
  ],
};

export function getAUDITScore(answers: Record<string, number>): number {
  return AUDIT.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
}

export function getAUDITSeverity(score: number) {
  return AUDIT.severity.find(s => score <= s.max) || AUDIT.severity[AUDIT.severity.length - 1];
}

// ---------------------------------------------------------------------------
// DAST-10 — Drug Abuse Screening Test (10-item)
// Developed by Harvey Skinner, PhD (1982). Validated for clinical use.
// ---------------------------------------------------------------------------

export const DAST10 = {
  id: "dast10",
  name: "DAST-10",
  fullName: "Drug Abuse Screening Test – 10",
  description: "Drug use screening (Skinner, 1982)",
  instructions: "The following questions concern information about your possible involvement with drugs, excluding alcohol and tobacco, during the past 12 months. Answer YES or NO for each question.",
  maxScore: 10,

  // Questions where "YES" = 1 point (except q3 where "NO" = 1 point)
  questions: [
    {
      id: "q1",
      text: "Have you used drugs other than those required for medical reasons?",
      scoreOnYes: true,
    },
    {
      id: "q2",
      text: "Do you abuse more than one drug at a time?",
      scoreOnYes: true,
    },
    {
      id: "q3",
      text: "Are you always able to stop using drugs when you want to?",
      scoreOnYes: false, // "No" scores 1
    },
    {
      id: "q4",
      text: "Have you had 'blackouts' or 'flashbacks' as a result of drug use?",
      scoreOnYes: true,
    },
    {
      id: "q5",
      text: "Do you ever feel bad or guilty about your drug use?",
      scoreOnYes: true,
    },
    {
      id: "q6",
      text: "Does your spouse (or parents) ever complain about your involvement with drugs?",
      scoreOnYes: true,
    },
    {
      id: "q7",
      text: "Have you neglected your family because of your use of drugs?",
      scoreOnYes: true,
    },
    {
      id: "q8",
      text: "Have you engaged in illegal activities in order to obtain drugs?",
      scoreOnYes: true,
    },
    {
      id: "q9",
      text: "Have you ever experienced withdrawal symptoms (felt sick) when you stopped taking drugs?",
      scoreOnYes: true,
    },
    {
      id: "q10",
      text: "Have you had medical problems as a result of your drug use (e.g., memory loss, hepatitis, convulsions, bleeding)?",
      scoreOnYes: true,
    },
  ],

  severity: [
    {
      max: 0,
      label: "No Problem",
      color: "bg-emerald-100 text-emerald-700",
      recommendation: "No intervention needed. Reinforce abstinence or responsible use.",
    },
    {
      max: 2,
      label: "Low Level",
      color: "bg-blue-100 text-blue-700",
      recommendation: "Monitor and provide brief education on drug use risks.",
    },
    {
      max: 5,
      label: "Moderate Level",
      color: "bg-amber-100 text-amber-700",
      recommendation: "Further assessment indicated. Brief intervention and referral to counseling as appropriate.",
    },
    {
      max: 8,
      label: "Substantial Level",
      color: "bg-orange-100 text-orange-700",
      recommendation: "Assessment and referral to a substance use treatment program recommended.",
    },
    {
      max: 10,
      label: "Severe Level",
      color: "bg-red-100 text-red-700",
      recommendation: "Intensive treatment required. Refer to a specialist immediately for evaluation and treatment.",
    },
  ],
};

export function getDAST10Score(answers: Record<string, boolean | null>): number {
  return DAST10.questions.reduce((sum, q) => {
    const response = answers[q.id];
    if (response === null || response === undefined) return sum;
    const scores = q.scoreOnYes ? (response ? 1 : 0) : (response ? 0 : 1);
    return sum + scores;
  }, 0);
}

export function getDAST10Severity(score: number) {
  return DAST10.severity.find(s => score <= s.max) || DAST10.severity[DAST10.severity.length - 1];
}
