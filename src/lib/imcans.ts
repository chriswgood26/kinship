// Illinois IM+CANS Assessment Domains and Items
// Rating scale: 0=No evidence, 1=History/mild, 2=Moderate/action needed, 3=Severe/immediate action

export const RATING_LABELS = [
  { value: 0, label: "0 — No Evidence", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: 1, label: "1 — Watchful / History", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: 2, label: "2 — Action Needed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: 3, label: "3 — Immediate Action", color: "bg-red-100 text-red-700 border-red-200" },
];

export interface IMCANSItem {
  id: string;
  label: string;
  description: string;
  reversed?: boolean; // for strengths (higher = better)
}

export interface IMCANSDomain {
  id: string;
  label: string;
  icon: string;
  color: string;
  items: IMCANSItem[];
  isStrengths?: boolean;
}

export const IMCANS_DOMAINS: IMCANSDomain[] = [
  {
    id: "behavioral_emotional",
    label: "Behavioral & Emotional Needs",
    icon: "🧠",
    color: "border-purple-200 bg-purple-50",
    items: [
      { id: "psychosis", label: "Psychosis", description: "Hallucinations, delusions, or disorganized thinking affecting functioning" },
      { id: "impulsivity", label: "Impulsivity/Hyperactivity", description: "Difficulty controlling behavior, excessive activity, or acting without thinking" },
      { id: "depression", label: "Depression", description: "Depressed mood, sadness, hopelessness, anhedonia, or withdrawal" },
      { id: "anxiety", label: "Anxiety", description: "Worry, fear, panic, avoidance, or physical anxiety symptoms" },
      { id: "oppositional", label: "Oppositional Behavior", description: "Defiance, noncompliance, argumentativeness, or rule-breaking behavior" },
      { id: "conduct", label: "Conduct", description: "Aggression toward others, destruction of property, deceitfulness" },
      { id: "substance_use", label: "Substance Use", description: "Use of alcohol, marijuana, or other substances affecting functioning" },
      { id: "attention", label: "Attention", description: "Difficulty sustaining attention, distractibility, disorganization" },
      { id: "affect_dysregulation", label: "Affect Dysregulation", description: "Mood instability, intense emotional reactions, difficulty calming" },
      { id: "eating_disturbance", label: "Eating Disturbance", description: "Disordered eating behaviors, restriction, binging, purging" },
      { id: "somatization", label: "Somatization", description: "Physical complaints without medical explanation, excessive health concerns" },
      { id: "sleep_disturbance", label: "Sleep Disturbance", description: "Difficulty falling asleep, staying asleep, nightmares, or hypersomnia" },
    ],
  },
  {
    id: "risk_behaviors",
    label: "Risk Behaviors",
    icon: "⚠️",
    color: "border-red-200 bg-red-50",
    items: [
      { id: "self_harm", label: "Self-Harm", description: "Non-suicidal self-injurious behavior (cutting, burning, hitting self)" },
      { id: "suicidal_ideation", label: "Suicide Risk", description: "Suicidal thoughts, plans, intent, or past attempts" },
      { id: "other_harm", label: "Danger to Others", description: "Homicidal ideation, threats, or history of violence toward others" },
      { id: "elopement", label: "Runaway / Elopement", description: "Running away from home, school, or placement" },
      { id: "fire_setting", label: "Fire Setting", description: "Deliberate fire setting or interest in fires" },
      { id: "sexual_behavior", label: "Sexual Behavior Problems", description: "Age-inappropriate sexual behavior or concerning sexual acting out" },
      { id: "exploitation", label: "Exploitation", description: "Vulnerability to or experience of exploitation, trafficking risk" },
    ],
  },
  {
    id: "trauma",
    label: "Trauma Experiences",
    icon: "💔",
    color: "border-orange-200 bg-orange-50",
    items: [
      { id: "physical_abuse", label: "Physical Abuse", description: "History or current experience of physical abuse" },
      { id: "sexual_abuse", label: "Sexual Abuse", description: "History or current experience of sexual abuse or assault" },
      { id: "emotional_abuse", label: "Emotional Abuse", description: "History or current experience of emotional or psychological abuse" },
      { id: "neglect", label: "Neglect", description: "History or current experience of caregiver neglect" },
      { id: "domestic_violence", label: "Domestic Violence Exposure", description: "Witness to or exposure to domestic violence in the home" },
      { id: "community_violence", label: "Community Violence", description: "Exposure to violence in the neighborhood or community" },
      { id: "traumatic_loss", label: "Traumatic Loss / Grief", description: "Death of significant person, traumatic bereavement" },
      { id: "natural_disaster", label: "Natural/Manmade Disaster", description: "Exposure to disaster, accident, war, or mass violence" },
    ],
  },
  {
    id: "life_domain",
    label: "Life Domain Functioning",
    icon: "🌐",
    color: "border-blue-200 bg-blue-50",
    items: [
      { id: "family", label: "Family", description: "Family relationship quality, conflict, cohesion, communication" },
      { id: "school", label: "School", description: "Academic functioning, attendance, behavior at school" },
      { id: "peers", label: "Social Functioning", description: "Peer relationships, social skills, isolation or social problems" },
      { id: "legal", label: "Legal", description: "Involvement with juvenile justice, charges, probation" },
      { id: "living_situation", label: "Living Situation", description: "Safety and stability of home environment" },
      { id: "recreational", label: "Recreational", description: "Participation in age-appropriate recreational activities" },
      { id: "developmental", label: "Developmental", description: "Developmental delays or disabilities affecting functioning" },
      { id: "medical", label: "Medical/Physical", description: "Physical health conditions affecting functioning" },
    ],
  },
  {
    id: "strengths",
    label: "Child/Youth Strengths",
    icon: "⭐",
    color: "border-emerald-200 bg-emerald-50",
    isStrengths: true,
    items: [
      { id: "family_strengths", label: "Family", description: "Supportive family relationships and positive family dynamics", reversed: true },
      { id: "interpersonal", label: "Interpersonal", description: "Positive peer relationships and social connections", reversed: true },
      { id: "educational", label: "Educational", description: "Academic engagement, learning strengths, school connectedness", reversed: true },
      { id: "vocational", label: "Vocational", description: "Work experience, job skills, vocational interests", reversed: true },
      { id: "well_being", label: "Well-Being", description: "General sense of happiness, satisfaction with life", reversed: true },
      { id: "spiritual", label: "Spiritual/Religious", description: "Faith community, spiritual practices providing support", reversed: true },
      { id: "community", label: "Community Life", description: "Connection to community, cultural ties, community resources", reversed: true },
      { id: "optimism", label: "Optimism", description: "Hope for the future, positive outlook, resilience", reversed: true },
      { id: "talents", label: "Talents/Interests", description: "Hobbies, creative talents, special interests or skills", reversed: true },
      { id: "relationship_permanence", label: "Relationship Permanence", description: "Stable, enduring relationships with caring adults", reversed: true },
    ],
  },
  {
    id: "caregiver",
    label: "Caregiver Needs & Strengths",
    icon: "👨‍👩‍👧",
    color: "border-teal-200 bg-teal-50",
    items: [
      { id: "caregiver_mental_health", label: "Caregiver Mental Health", description: "Caregiver's own mental health needs affecting parenting" },
      { id: "caregiver_substance", label: "Caregiver Substance Use", description: "Caregiver substance use affecting family functioning" },
      { id: "caregiver_trauma", label: "Caregiver Trauma", description: "Caregiver's own trauma history affecting parenting" },
      { id: "supervision", label: "Supervision", description: "Caregiver's ability to provide appropriate supervision" },
      { id: "involvement", label: "Involvement", description: "Caregiver engagement and participation in child's treatment" },
      { id: "knowledge", label: "Knowledge", description: "Caregiver understanding of child's needs and condition" },
      { id: "caregiver_support", label: "Caregiver Support", description: "Social support available to caregiver (family, community)", reversed: true },
      { id: "caregiver_relationship", label: "Relationship with Child", description: "Quality of caregiver-child relationship and attachment", reversed: true },
    ],
  },
];

export const LOC_THRESHOLDS = [
  { max: 10, level: "Level 1 — Outpatient", description: "Weekly or biweekly therapy; low intensity" },
  { max: 20, level: "Level 2 — Intensive Outpatient", description: "IOP 3+ hours/day; multiple services" },
  { max: 35, level: "Level 3 — Partial Hospitalization", description: "PHP 5+ hours/day; structured day treatment" },
  { max: 50, level: "Level 4 — Residential", description: "24-hour residential treatment" },
  { max: 999, level: "Level 5 — Inpatient Psychiatric", description: "Acute psychiatric hospitalization" },
];

export function calcLOC(totalScore: number): string {
  return LOC_THRESHOLDS.find(t => totalScore <= t.max)?.level || "Level 5 — Inpatient";
}

export function calcDomainScore(scores: Record<string, number>, domain: IMCANSDomain): number {
  return domain.items.reduce((sum, item) => sum + (scores[item.id] || 0), 0);
}

export function calcTotalNeedScore(scores: Record<string, number>): number {
  const needDomains = IMCANS_DOMAINS.filter(d => !d.isStrengths);
  return needDomains.reduce((sum, domain) => sum + calcDomainScore(scores, domain), 0);
}
