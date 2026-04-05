// ACE Questionnaire — Adverse Childhood Experiences
// Based on the original CDC-Kaiser Permanente ACE Study (Felitti et al., 1998)
// Trauma-informed care screening tool

export const ACE = {
  id: "ace",
  name: "ACE",
  fullName: "Adverse Childhood Experiences Questionnaire",
  description: "Trauma-informed care screening for childhood adversity",
  instructions:
    "While you were growing up, during your first 18 years of life, did any of the following experiences happen? Answer YES or NO for each question.",
  maxScore: 10,

  // Categories: Abuse (3), Neglect (2), Household Dysfunction (5)
  questions: [
    {
      id: "q1",
      category: "Emotional Abuse",
      text: "Did a parent or other adult in the household often or very often swear at you, insult you, put you down, or humiliate you? Or act in a way that made you afraid that you might be physically hurt?",
    },
    {
      id: "q2",
      category: "Physical Abuse",
      text: "Did a parent or other adult in the household often or very often push, grab, slap, or throw something at you? Or ever hit you so hard that you had marks or were injured?",
    },
    {
      id: "q3",
      category: "Sexual Abuse",
      text: "Did an adult or person at least 5 years older than you ever touch or fondle you or have you touch their body in a sexual way? Or attempt or actually have oral, anal, or vaginal intercourse with you?",
    },
    {
      id: "q4",
      category: "Emotional Neglect",
      text: "Did you often or very often feel that no one in your family loved you or thought you were important or special? Or your family didn't look out for each other, feel close to each other, or support each other?",
    },
    {
      id: "q5",
      category: "Physical Neglect",
      text: "Did you often or very often feel that you didn't have enough to eat, had to wear dirty clothes, and had no one to protect you? Or your parents were too drunk or high to take care of you or take you to the doctor if you needed it?",
    },
    {
      id: "q6",
      category: "Parental Separation or Divorce",
      text: "Were your parents ever separated or divorced?",
    },
    {
      id: "q7",
      category: "Domestic Violence (Witnessed)",
      text: "Was your mother or stepmother often or very often pushed, grabbed, slapped, or had something thrown at her? Or sometimes, often, or very often kicked, bitten, hit with a fist, or hit with something hard? Or ever repeatedly hit for at least a few minutes or threatened with a gun or knife?",
    },
    {
      id: "q8",
      category: "Substance Abuse in Household",
      text: "Did you live with anyone who was a problem drinker or alcoholic, or who used street drugs?",
    },
    {
      id: "q9",
      category: "Mental Illness in Household",
      text: "Was a household member depressed or mentally ill, or did a household member attempt suicide?",
    },
    {
      id: "q10",
      category: "Incarcerated Household Member",
      text: "Did a household member go to prison?",
    },
  ],

  severity: [
    {
      max: 0,
      label: "No ACEs",
      color: "bg-emerald-100 text-emerald-700",
      recommendation:
        "No adverse childhood experiences identified. Continue routine trauma-informed screening at future visits.",
    },
    {
      max: 3,
      label: "Low–Moderate Risk",
      color: "bg-amber-100 text-amber-700",
      recommendation:
        "1–3 ACEs present. Increased risk for some chronic health and behavioral health conditions. Provide psychoeducation on ACEs and resilience. Monitor for trauma-related symptoms.",
    },
    {
      max: 6,
      label: "High Risk",
      color: "bg-orange-100 text-orange-700",
      recommendation:
        "4–6 ACEs present. Significantly elevated risk for depression, anxiety, PTSD, substance use disorders, and chronic disease. Conduct comprehensive trauma assessment. Prioritize trauma-informed treatment planning and community supports.",
    },
    {
      max: 10,
      label: "Very High Risk",
      color: "bg-red-100 text-red-700",
      recommendation:
        "7–10 ACEs present. Severe cumulative trauma exposure. Refer to trauma-specialized services immediately. Address safety, stabilization, and social determinants of health. Coordinate multidisciplinary care.",
    },
  ],
};

export function getACEScore(answers: Record<string, boolean | null>): number {
  return ACE.questions.reduce((sum, q) => {
    return sum + (answers[q.id] === true ? 1 : 0);
  }, 0);
}

export function getACESeverity(score: number) {
  return ACE.severity.find(s => score <= s.max) || ACE.severity[ACE.severity.length - 1];
}
