// Addiction Severity Index (ASI) — 5th Edition
// McLellan et al., 1992. Public domain assessment tool.
// 7 domains: Medical, Employment, Drug/Alcohol, Legal, Family/Social, Psychiatric

export const ASI_VERSION = "5th Edition";

// Interviewer composite severity scale (0–9)
export const INTERVIEWER_SEVERITY_LABELS = [
  { value: 0, label: "0 — No real problem" },
  { value: 1, label: "1 — Slight problem" },
  { value: 2, label: "2 — Some problem" },
  { value: 3, label: "3 — Moderate problem" },
  { value: 4, label: "4 — Considerable problem" },
  { value: 5, label: "5 — Considerable problem" },
  { value: 6, label: "6 — Considerable problem" },
  { value: 7, label: "7 — Extreme problem" },
  { value: 8, label: "8 — Extreme problem" },
  { value: 9, label: "9 — Extreme/immediate problem" },
];

// Client self-rating (0–4): how much have you been bothered / how important is treatment
export const CLIENT_IMPORTANCE_LABELS = [
  { value: 0, label: "0 — Not at all" },
  { value: 1, label: "1 — Slightly" },
  { value: 2, label: "2 — Moderately" },
  { value: 3, label: "3 — Considerably" },
  { value: 4, label: "4 — Extremely" },
];

export const ASI_DOMAINS = [
  { id: "medical",     label: "Medical Status",              icon: "🏥" },
  { id: "employment",  label: "Employment & Support",        icon: "💼" },
  { id: "alcohol",     label: "Alcohol Use",                 icon: "🍺" },
  { id: "drug",        label: "Drug Use",                    icon: "💊" },
  { id: "legal",       label: "Legal Status",                icon: "⚖️" },
  { id: "family",      label: "Family & Social",             icon: "👨‍👩‍👧" },
  { id: "psychiatric", label: "Psychiatric Status",          icon: "🧠" },
];

// Severity band descriptions
export const SEVERITY_BANDS = [
  { max: 2,  label: "Low",      color: "bg-emerald-100 text-emerald-700", description: "No/minimal treatment need" },
  { max: 4,  label: "Moderate", color: "bg-amber-100 text-amber-700",    description: "Treatment advisable" },
  { max: 6,  label: "High",     color: "bg-orange-100 text-orange-700",  description: "Treatment necessary" },
  { max: 9,  label: "Critical", color: "bg-red-100 text-red-700",        description: "Immediate intervention required" },
];

export function getSeverityBand(rating: number) {
  return SEVERITY_BANDS.find(b => rating <= b.max) || SEVERITY_BANDS[SEVERITY_BANDS.length - 1];
}

export function getCompositeSeverity(interviewerRatings: Record<string, number>): number {
  const vals = Object.values(interviewerRatings).filter(v => typeof v === "number");
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
