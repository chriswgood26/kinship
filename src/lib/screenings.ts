// Standardized Screening Tools — PHQ-9 and GAD-7

export const RATING_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export const PHQ9 = {
  id: "phq9",
  name: "PHQ-9",
  fullName: "Patient Health Questionnaire-9",
  description: "Depression screening tool",
  instructions: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  maxScore: 27,
  questions: [
    { id: "q1", text: "Little interest or pleasure in doing things" },
    { id: "q2", text: "Feeling down, depressed, or hopeless" },
    { id: "q3", text: "Trouble falling or staying asleep, or sleeping too much" },
    { id: "q4", text: "Feeling tired or having little energy" },
    { id: "q5", text: "Poor appetite or overeating" },
    { id: "q6", text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down" },
    { id: "q7", text: "Trouble concentrating on things, such as reading the newspaper or watching television" },
    { id: "q8", text: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual" },
    { id: "q9", text: "Thoughts that you would be better off dead or of hurting yourself in some way" },
  ],
  bonus: {
    id: "q10",
    text: "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
    options: [
      { value: 0, label: "Not difficult at all" },
      { value: 1, label: "Somewhat difficult" },
      { value: 2, label: "Very difficult" },
      { value: 3, label: "Extremely difficult" },
    ],
  },
  severity: [
    { max: 4,  label: "Minimal", color: "bg-emerald-100 text-emerald-700", recommendation: "Monitor; may not require treatment" },
    { max: 9,  label: "Mild", color: "bg-blue-100 text-blue-700", recommendation: "Watchful waiting; repeat PHQ-9 at follow-up" },
    { max: 14, label: "Moderate", color: "bg-amber-100 text-amber-700", recommendation: "Treatment plan, counseling and/or pharmacotherapy" },
    { max: 19, label: "Moderately Severe", color: "bg-orange-100 text-orange-700", recommendation: "Active treatment with pharmacotherapy and/or psychotherapy" },
    { max: 27, label: "Severe", color: "bg-red-100 text-red-700", recommendation: "Immediate initiation of pharmacotherapy and, if severe impairment or poor response, expedited referral to mental health specialist" },
  ],
};

export const GAD7 = {
  id: "gad7",
  name: "GAD-7",
  fullName: "Generalized Anxiety Disorder-7",
  description: "Anxiety screening tool",
  instructions: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  maxScore: 21,
  questions: [
    { id: "q1", text: "Feeling nervous, anxious, or on edge" },
    { id: "q2", text: "Not being able to stop or control worrying" },
    { id: "q3", text: "Worrying too much about different things" },
    { id: "q4", text: "Trouble relaxing" },
    { id: "q5", text: "Being so restless that it is hard to sit still" },
    { id: "q6", text: "Becoming easily annoyed or irritable" },
    { id: "q7", text: "Feeling afraid, as if something awful might happen" },
  ],
  bonus: {
    id: "q8",
    text: "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
    options: [
      { value: 0, label: "Not difficult at all" },
      { value: 1, label: "Somewhat difficult" },
      { value: 2, label: "Very difficult" },
      { value: 3, label: "Extremely difficult" },
    ],
  },
  severity: [
    { max: 4,  label: "Minimal", color: "bg-emerald-100 text-emerald-700", recommendation: "Monitor; may not require treatment" },
    { max: 9,  label: "Mild", color: "bg-blue-100 text-blue-700", recommendation: "Watchful waiting; repeat GAD-7 at follow-up" },
    { max: 14, label: "Moderate", color: "bg-amber-100 text-amber-700", recommendation: "Possible clinically significant condition; consider treatment" },
    { max: 21, label: "Severe", color: "bg-red-100 text-red-700", recommendation: "Active treatment warranted; refer to mental health specialist" },
  ],
};

export function getScore(answers: Record<string, number>, questions: { id: string }[]): number {
  return questions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
}

export function getSeverity(score: number, tool: typeof PHQ9 | typeof GAD7) {
  return tool.severity.find(s => score <= s.max) || tool.severity[tool.severity.length - 1];
}

export function isSuicidalIdeation(answers: Record<string, number>): boolean {
  return (answers["q9"] || 0) > 0; // PHQ-9 question 9
}
