// Columbia Suicide Severity Rating Scale (C-SSRS)
// Standardized suicide risk assessment tool

export const CSSRS = {
  id: "cssrs",
  name: "C-SSRS",
  fullName: "Columbia Suicide Severity Rating Scale",
  description: "Standardized suicide risk assessment",
  instructions: "Ask the client about each of the following thoughts and behaviors.",
  version: "Since Last Visit",

  // Ideation subscale - YES/NO with escalating severity
  ideation: {
    label: "Suicidal Ideation",
    description: "Answer YES or NO for each item. Stop if client answers NO to questions 1 and 2.",
    questions: [
      {
        id: "i1",
        severity: 1,
        label: "Wish to be Dead",
        text: "Have you wished you were dead or wished you could go to sleep and not wake up?",
        followUp: null,
      },
      {
        id: "i2",
        severity: 2,
        label: "Non-specific Active Suicidal Thoughts",
        text: "Have you had any actual thoughts of killing yourself?",
        followUp: null,
      },
      {
        id: "i3",
        severity: 3,
        label: "Active Suicidal Ideation with Method (without plan or intent)",
        text: "Have you been thinking about how you might do this? (e.g., taking pills, shooting yourself)",
        followUp: null,
      },
      {
        id: "i4",
        severity: 4,
        label: "Active Suicidal Ideation with Some Intent (without specific plan)",
        text: "Have you had these thoughts and had some intention of acting on them?",
        followUp: null,
      },
      {
        id: "i5",
        severity: 5,
        label: "Active Suicidal Ideation with Specific Plan and Intent",
        text: "Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?",
        followUp: null,
      },
    ],
  },

  // Intensity subscale (only if i1-i5 has any YES)
  intensity: {
    label: "Intensity of Ideation",
    description: "Rate the MOST SEVERE ideation identified above.",
    questions: [
      {
        id: "int1",
        label: "Frequency",
        text: "How many times have you had these thoughts in the past month?",
        options: [
          { value: 1, label: "Less than once a week" },
          { value: 2, label: "Once a week" },
          { value: 3, label: "2-5 times a week" },
          { value: 4, label: "Daily or almost daily" },
          { value: 5, label: "Many times per day" },
        ],
      },
      {
        id: "int2",
        label: "Duration",
        text: "When you have the thoughts, how long do they last?",
        options: [
          { value: 1, label: "Fleeting - few seconds or minutes" },
          { value: 2, label: "Less than 1 hour/some of the time" },
          { value: 3, label: "1-4 hours/a lot of time" },
          { value: 4, label: "4-8 hours/most of time" },
          { value: 5, label: "More than 8 hours/persistent or continuous" },
        ],
      },
      {
        id: "int3",
        label: "Controllability",
        text: "Could/can you control your thoughts of suicide or stop thinking about suicide if you wanted to?",
        options: [
          { value: 1, label: "Easily able to control thoughts" },
          { value: 2, label: "Able to control thoughts with little difficulty" },
          { value: 3, label: "With some difficulty able to control thoughts" },
          { value: 4, label: "Can control thoughts with a lot of difficulty" },
          { value: 5, label: "Unable to control thoughts" },
          { value: 0, label: "Does not attempt to control thoughts" },
        ],
      },
      {
        id: "int4",
        label: "Deterrents",
        text: "Are there things — family, religion, pain of dying — that stopped you from wanting to kill yourself?",
        options: [
          { value: 1, label: "Deterrents definitely stopped from attempting" },
          { value: 2, label: "Deterrents probably stopped attempt" },
          { value: 3, label: "Uncertain that deterrents stopped attempt" },
          { value: 4, label: "Deterrents most likely did not stop" },
          { value: 5, label: "Deterrents definitely did not stop" },
          { value: 0, label: "Does not apply" },
        ],
      },
      {
        id: "int5",
        label: "Reasons for Ideation",
        text: "What sort of reasons did you have for thinking about wanting to die or killing yourself?",
        options: [
          { value: 1, label: "To get attention, revenge, or reaction" },
          { value: 2, label: "Mixed — some to get attention, some to end/stop pain" },
          { value: 3, label: "Mostly to end or stop the pain (can\'t go on)" },
        ],
      },
    ],
  },

  // Behavior subscale (past 3 months)
  behavior: {
    label: "Suicidal Behavior",
    description: "Has the client engaged in any of the following behaviors in the past 3 months?",
    questions: [
      {
        id: "b1",
        label: "Preparatory Acts or Behavior",
        text: "Have you done anything, started to do anything, or prepared to do anything to end your life? (e.g., collected pills, obtained a gun, gave away valuables, wrote a will or suicide note)",
      },
      {
        id: "b2",
        label: "Aborted Attempt",
        text: "Have you started to do something to end your life but stopped yourself before you actually did anything?",
      },
      {
        id: "b3",
        label: "Interrupted Attempt",
        text: "Did someone or something stop you from doing something to end your life when it had already been started?",
      },
      {
        id: "b4",
        label: "Actual Attempt",
        text: "Have you made a suicide attempt? (Intentional self-injurious act with at least some intent to die)",
      },
      {
        id: "b5",
        label: "Completed Suicide",
        text: "Has there been a completed suicide in your family or close circle recently?",
        note: "Clinical context only — not self-report",
      },
    ],
  },

  // Risk stratification
  riskLevels: [
    {
      level: "Low Risk",
      color: "bg-emerald-100 text-emerald-700",
      borderColor: "border-emerald-300",
      description: "Passive ideation only (wish to be dead), no plan, no intent, no behavior",
      action: "Enhanced outpatient monitoring; safety planning; increase session frequency",
    },
    {
      level: "Moderate Risk",
      color: "bg-amber-100 text-amber-700",
      borderColor: "border-amber-300",
      description: "Active ideation with method but no plan or intent; or preparatory behavior",
      action: "Safety planning required; consider higher level of care; contact crisis services if needed",
    },
    {
      level: "High Risk",
      color: "bg-orange-100 text-orange-700",
      borderColor: "border-orange-300",
      description: "Active ideation with intent; specific plan; aborted or interrupted attempt",
      action: "Immediate intervention required; consider psychiatric hospitalization; do not leave alone",
    },
    {
      level: "Imminent Risk",
      color: "bg-red-100 text-red-700",
      borderColor: "border-red-300",
      description: "Active attempt; imminent intent with specific plan and means available",
      action: "EMERGENCY — Call 911 or mobile crisis team immediately; do not leave client alone",
    },
  ],
};

export function getCSSRSRisk(
  ideationAnswers: Record<string, boolean>,
  behaviorAnswers: Record<string, boolean>
): { level: string; color: string; borderColor: string; description: string; action: string } {
  const highestIdeation = Object.entries(ideationAnswers)
    .filter(([, v]) => v)
    .map(([k]) => parseInt(k.replace("i", "")))
    .reduce((max, n) => Math.max(max, n), 0);

  const hasActualAttempt = behaviorAnswers["b4"];
  const hasAbortedOrInterrupted = behaviorAnswers["b2"] || behaviorAnswers["b3"];
  const hasPreparatory = behaviorAnswers["b1"];

  if (hasActualAttempt || highestIdeation >= 5) return CSSRS.riskLevels[3]; // Imminent
  if (highestIdeation >= 4 || hasAbortedOrInterrupted) return CSSRS.riskLevels[2]; // High
  if (highestIdeation >= 3 || hasPreparatory) return CSSRS.riskLevels[1]; // Moderate
  return CSSRS.riskLevels[0]; // Low
}
