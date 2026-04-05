// Cognitive Screening Tools — MoCA and MMSE
// MoCA: Montreal Cognitive Assessment (Nasreddine et al., 2005)
// MMSE: Mini-Mental State Examination (Folstein et al., 1975)

export interface CognitiveItem {
  id: string;
  text: string;
  adminNote?: string;
  maxPoints: number;
}

export interface CognitiveDomain {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  maxPoints: number;
  items: CognitiveItem[];
}

export interface CognitiveTool {
  id: string;
  name: string;
  fullName: string;
  description: string;
  maxScore: number;
  educationBonus?: boolean;
  domains: CognitiveDomain[];
  severity: { max: number; label: string; color: string; recommendation: string }[];
}

// ---------------------------------------------------------------------------
// MoCA — Montreal Cognitive Assessment
// Standard cutoff: ≥26 normal; educationally adjusted (+1 if ≤12 yrs schooling)
// ---------------------------------------------------------------------------

export const MOCA: CognitiveTool = {
  id: "moca",
  name: "MoCA",
  fullName: "Montreal Cognitive Assessment",
  description: "Cognitive screening for MCI and dementia (30-point scale)",
  maxScore: 30,
  educationBonus: true,

  domains: [
    {
      id: "visuospatial",
      name: "Visuospatial / Executive",
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-100",
      maxPoints: 5,
      items: [
        { id: "trail", text: "Alternating Trail Making (1–A–2–B–3–C–4–D–5–E)", adminNote: "Draw a line alternating between numbers and letters in order. Score 1 if completed correctly without errors.", maxPoints: 1 },
        { id: "cube", text: "Visuoconstructional Skills — Cube Copy", adminNote: "Copy a three-dimensional cube. Score 1 if the drawing has all features and is in three dimensions.", maxPoints: 1 },
        { id: "clock_contour", text: "Clock Drawing — Contour (circle)", adminNote: "Draw clock face. Score 1 if clock contour is present (circle, with reasonable proportions).", maxPoints: 1 },
        { id: "clock_numbers", text: "Clock Drawing — Numbers", adminNote: "Score 1 if all 12 numbers are present with no additional numbers, and in correct order and position.", maxPoints: 1 },
        { id: "clock_hands", text: "Clock Drawing — Hands (11:10)", adminNote: "Score 1 if two hands are present indicating the correct time (11:10), both hands pointing to the right positions.", maxPoints: 1 },
      ],
    },
    {
      id: "naming",
      name: "Naming",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50 border-emerald-100",
      maxPoints: 3,
      items: [
        { id: "lion", text: "Name: Lion", adminNote: "Show picture. Score 1 if correctly identified.", maxPoints: 1 },
        { id: "rhino", text: "Name: Rhinoceros", adminNote: "Show picture. Score 1 if correctly identified.", maxPoints: 1 },
        { id: "camel", text: "Name: Camel / Dromedary", adminNote: "Show picture. Score 1 if correctly identified (either word acceptable).", maxPoints: 1 },
      ],
    },
    {
      id: "attention",
      name: "Attention",
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-100",
      maxPoints: 6,
      items: [
        { id: "digit_fwd", text: "Forward Digit Span (2-1-8-5-4)", adminNote: "Read digits at 1 per second. Score 1 if repeated correctly on the first attempt.", maxPoints: 1 },
        { id: "digit_bkwd", text: "Backward Digit Span (7-4-2)", adminNote: "Read digits at 1 per second. Ask client to repeat in reverse. Score 1 if repeated correctly.", maxPoints: 1 },
        { id: "vigilance", text: "Vigilance — Tap on Letter 'A'", adminNote: "Read 60-letter sequence. Client taps every time they hear 'A'. Score 1 if ≤1 error (error = tap on wrong letter or fail to tap on A).", maxPoints: 1 },
        { id: "serial7", text: "Serial 7s (subtract 7 from 100, five times)", adminNote: "93–86–79–72–65. Score: 4–5 correct = 3 pts; 2–3 correct = 2 pts; 1 correct = 1 pt; 0 correct = 0 pts.", maxPoints: 3 },
      ],
    },
    {
      id: "language",
      name: "Language",
      color: "text-amber-700",
      bgColor: "bg-amber-50 border-amber-100",
      maxPoints: 3,
      items: [
        { id: "sentence1", text: "Repeat: \"I only know that John is the one to help today.\"", adminNote: "Score 1 if repeated perfectly (verbatim).", maxPoints: 1 },
        { id: "sentence2", text: "Repeat: \"The cat always hid under the couch when dogs were in the room.\"", adminNote: "Score 1 if repeated perfectly (verbatim).", maxPoints: 1 },
        { id: "fluency", text: "Verbal Fluency — Words beginning with letter 'F' (60 seconds)", adminNote: "Score 1 if client generates ≥11 words in 60 seconds. Do not count proper nouns, numbers, or the same word with different suffix.", maxPoints: 1 },
      ],
    },
    {
      id: "abstraction",
      name: "Abstraction",
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-100",
      maxPoints: 2,
      items: [
        { id: "abstract1", text: "Similarity: Train – Bicycle", adminNote: "Ask: \"In what way are a train and a bicycle alike?\" Score 1 if says both are modes of transportation / vehicles (accept similar concepts). Do not score 'both have wheels.'", maxPoints: 1 },
        { id: "abstract2", text: "Similarity: Ruler – Watch", adminNote: "Ask: \"In what way are a ruler and a watch alike?\" Score 1 if says both are measuring instruments (accept similar). Do not score 'both have numbers.'", maxPoints: 1 },
      ],
    },
    {
      id: "delayed_recall",
      name: "Delayed Recall",
      color: "text-rose-700",
      bgColor: "bg-rose-50 border-rose-100",
      maxPoints: 5,
      items: [
        { id: "recall_face", text: "Recall: FACE", adminNote: "Score 1 point for each word recalled freely (without cue). Words given: Face, Velvet, Church, Daisy, Red.", maxPoints: 1 },
        { id: "recall_velvet", text: "Recall: VELVET", adminNote: "Score 1 point for each word recalled freely.", maxPoints: 1 },
        { id: "recall_church", text: "Recall: CHURCH", adminNote: "Score 1 point for each word recalled freely.", maxPoints: 1 },
        { id: "recall_daisy", text: "Recall: DAISY", adminNote: "Score 1 point for each word recalled freely.", maxPoints: 1 },
        { id: "recall_red", text: "Recall: RED", adminNote: "Score 1 point for each word recalled freely.", maxPoints: 1 },
      ],
    },
    {
      id: "orientation",
      name: "Orientation",
      color: "text-teal-700",
      bgColor: "bg-teal-50 border-teal-100",
      maxPoints: 6,
      items: [
        { id: "orient_date", text: "Orientation: Date", adminNote: "Score 1 if correctly states today's date.", maxPoints: 1 },
        { id: "orient_month", text: "Orientation: Month", adminNote: "Score 1 if correctly states the current month.", maxPoints: 1 },
        { id: "orient_year", text: "Orientation: Year", adminNote: "Score 1 if correctly states the current year.", maxPoints: 1 },
        { id: "orient_day", text: "Orientation: Day of Week", adminNote: "Score 1 if correctly states the current day of the week.", maxPoints: 1 },
        { id: "orient_place", text: "Orientation: Place (facility/building)", adminNote: "Score 1 if correctly states the name of the place where the assessment is being conducted.", maxPoints: 1 },
        { id: "orient_city", text: "Orientation: City", adminNote: "Score 1 if correctly states the name of the city.", maxPoints: 1 },
      ],
    },
  ],

  severity: [
    { max: 9,  label: "Severe Impairment",   color: "bg-red-100 text-red-700",     recommendation: "Urgent referral to neurology/geriatrics. Likely significant cognitive disorder requiring comprehensive evaluation." },
    { max: 17, label: "Moderate Impairment", color: "bg-orange-100 text-orange-700", recommendation: "Refer to specialist for comprehensive neuropsychological evaluation. Consider pharmacotherapy and support services." },
    { max: 25, label: "Mild Impairment",     color: "bg-amber-100 text-amber-700",  recommendation: "Possible mild cognitive impairment (MCI). Repeat in 6–12 months; consider neuropsychological workup and risk factor management." },
    { max: 30, label: "Normal Cognition",    color: "bg-emerald-100 text-emerald-700", recommendation: "Score within normal limits. Rescreen annually or when concerns arise." },
  ],
};

// ---------------------------------------------------------------------------
// MMSE — Mini-Mental State Examination
// Folstein et al. (1975). Standard cutoff: ≥24 = no impairment.
// ---------------------------------------------------------------------------

export const MMSE: CognitiveTool = {
  id: "mmse",
  name: "MMSE",
  fullName: "Mini-Mental State Examination",
  description: "Standardized cognitive assessment for orientation, memory, and language (30-point scale)",
  maxScore: 30,

  domains: [
    {
      id: "orientation_time",
      name: "Orientation to Time",
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-100",
      maxPoints: 5,
      items: [
        { id: "time_year",   text: "What year is it?",            adminNote: "Score 1 for correct year.", maxPoints: 1 },
        { id: "time_season", text: "What season is it?",          adminNote: "Score 1 for correct season.", maxPoints: 1 },
        { id: "time_month",  text: "What month is it?",           adminNote: "Score 1 for correct month.", maxPoints: 1 },
        { id: "time_date",   text: "What is today's date?",       adminNote: "Score 1 for correct date.", maxPoints: 1 },
        { id: "time_day",    text: "What day of the week is it?", adminNote: "Score 1 for correct day of the week.", maxPoints: 1 },
      ],
    },
    {
      id: "orientation_place",
      name: "Orientation to Place",
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-100",
      maxPoints: 5,
      items: [
        { id: "place_state",    text: "What state are we in?",               adminNote: "Score 1 for correct state.", maxPoints: 1 },
        { id: "place_county",   text: "What county are we in?",              adminNote: "Score 1 for correct county.", maxPoints: 1 },
        { id: "place_town",     text: "What city or town are we in?",        adminNote: "Score 1 for correct city/town.", maxPoints: 1 },
        { id: "place_facility", text: "What is this place? (name/type)",     adminNote: "Score 1 if correctly names the hospital, clinic, or facility.", maxPoints: 1 },
        { id: "place_floor",    text: "What floor are we on?",               adminNote: "Score 1 for correct floor number.", maxPoints: 1 },
      ],
    },
    {
      id: "registration",
      name: "Registration",
      color: "text-emerald-700",
      bgColor: "bg-emerald-50 border-emerald-100",
      maxPoints: 3,
      items: [
        { id: "reg_apple",  text: "Register: APPLE",  adminNote: "Say three words clearly (apple, table, penny). Ask client to repeat. Score 1 point for each word correctly repeated on first attempt.", maxPoints: 1 },
        { id: "reg_table",  text: "Register: TABLE",  adminNote: "Score 1 for correct.", maxPoints: 1 },
        { id: "reg_penny",  text: "Register: PENNY",  adminNote: "Score 1 for correct. Repeat up to 6 times until all 3 are learned (but only first attempt is scored).", maxPoints: 1 },
      ],
    },
    {
      id: "attention",
      name: "Attention & Calculation",
      color: "text-amber-700",
      bgColor: "bg-amber-50 border-amber-100",
      maxPoints: 5,
      items: [
        { id: "serial7", text: "Serial 7s — subtract 7 from 100, five times (93, 86, 79, 72, 65)", adminNote: "Score 1 point for each correct subtraction (max 5). Stop after 5 subtractions. Alternatively: spell WORLD backwards (D-L-R-O-W), 1 pt per correct letter in correct position.", maxPoints: 5 },
      ],
    },
    {
      id: "recall",
      name: "Recall",
      color: "text-rose-700",
      bgColor: "bg-rose-50 border-rose-100",
      maxPoints: 3,
      items: [
        { id: "recall_apple",  text: "Recall: APPLE",  adminNote: "Ask client to recall the three words registered earlier. Score 1 point for each word recalled without prompting.", maxPoints: 1 },
        { id: "recall_table",  text: "Recall: TABLE",  adminNote: "Score 1 for correct.", maxPoints: 1 },
        { id: "recall_penny",  text: "Recall: PENNY",  adminNote: "Score 1 for correct.", maxPoints: 1 },
      ],
    },
    {
      id: "language",
      name: "Language",
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-100",
      maxPoints: 9,
      items: [
        { id: "name_pencil",  text: "Naming: Pencil",                adminNote: "Show a pencil. Score 1 if named correctly.", maxPoints: 1 },
        { id: "name_watch",   text: "Naming: Watch",                 adminNote: "Show a watch. Score 1 if named correctly.", maxPoints: 1 },
        { id: "repetition",   text: "Repeat: \"No ifs, ands, or buts\"", adminNote: "Score 1 if repeated exactly on the first attempt. No partial credit.", maxPoints: 1 },
        { id: "cmd1",         text: "3-Stage Command — Step 1: Take paper in right hand", adminNote: "Hand patient a blank sheet of paper and say: 'Take the paper in your right hand, fold it in half, and put it on the floor.' Score 1 for each correct step.", maxPoints: 1 },
        { id: "cmd2",         text: "3-Stage Command — Step 2: Fold paper in half",      adminNote: "Score 1 if paper is folded in half.", maxPoints: 1 },
        { id: "cmd3",         text: "3-Stage Command — Step 3: Put paper on the floor",  adminNote: "Score 1 if paper is placed on the floor.", maxPoints: 1 },
        { id: "reading",      text: "Reading: \"CLOSE YOUR EYES\" (written)",             adminNote: "Show written instruction 'CLOSE YOUR EYES'. Score 1 if client closes eyes.", maxPoints: 1 },
        { id: "writing",      text: "Writing: Write a complete sentence spontaneously",   adminNote: "Ask client to write a sentence. Score 1 if sentence has a subject and verb, and makes sense. Ignore spelling errors.", maxPoints: 1 },
        { id: "copying",      text: "Copying: Intersecting pentagons",                   adminNote: "Ask client to copy intersecting pentagon figure. Score 1 if the copy has two five-sided figures with a four-sided intersection area.", maxPoints: 1 },
      ],
    },
  ],

  severity: [
    { max: 9,  label: "Severe Impairment",   color: "bg-red-100 text-red-700",        recommendation: "Urgent referral warranted. Immediate safety assessment and comprehensive evaluation required." },
    { max: 17, label: "Moderate Impairment", color: "bg-orange-100 text-orange-700",  recommendation: "Refer for neurological evaluation. Consider pharmacotherapy (cholinesterase inhibitors) and safety planning." },
    { max: 23, label: "Mild Impairment",     color: "bg-amber-100 text-amber-700",    recommendation: "Consistent with mild cognitive impairment. Neuropsychological testing recommended; monitor closely." },
    { max: 30, label: "No Significant Impairment", color: "bg-emerald-100 text-emerald-700", recommendation: "Score within normal limits. Rescreen if clinically indicated." },
  ],
};

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function getCognitiveScore(
  answers: Record<string, number>,
  tool: CognitiveTool,
  educationBonus?: boolean,
): number {
  const base = tool.domains
    .flatMap(d => d.items)
    .reduce((sum, item) => sum + Math.min(answers[item.id] ?? 0, item.maxPoints), 0);
  return base + (educationBonus ? 1 : 0);
}

export function getCognitiveSeverity(score: number, tool: CognitiveTool) {
  return tool.severity.find(s => score <= s.max) || tool.severity[tool.severity.length - 1];
}

export function getDomainScore(answers: Record<string, number>, domain: CognitiveDomain): number {
  return domain.items.reduce((sum, item) => sum + Math.min(answers[item.id] ?? 0, item.maxPoints), 0);
}
