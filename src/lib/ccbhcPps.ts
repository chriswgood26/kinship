// CCBHC Prospective Payment System (PPS) — Kinship EHR
// Used by Certified Community Behavioral Health Clinics for Medicaid billing

// ─── Types ────────────────────────────────────────────────────────────────────

export type PpsMethodology = "pps1_daily" | "pps2_monthly";

export interface CcbhcPpsSettings {
  id: string;
  organization_id: string;
  methodology: PpsMethodology;
  daily_rate: number | null;        // PPS-1 per-diem rate (per client per qualifying day)
  monthly_rate: number | null;      // PPS-2 monthly rate (per client per qualifying month)
  billing_code: string;             // procedure code on the PPS claim (e.g. T1015)
  billing_modifier: string | null;  // optional modifier (e.g. state-specific)
  effective_date: string;           // YYYY-MM-DD
  state_program_id: string | null;  // state-assigned CCBHC program identifier
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CcbhcPpsClaim {
  id: string;
  organization_id: string;
  client_id: string;
  methodology: PpsMethodology;
  period_start: string;  // YYYY-MM-DD — for PPS-1: the service date; PPS-2: first day of month
  period_end: string;    // YYYY-MM-DD — for PPS-1: same as start; PPS-2: last day of month
  rate_applied: number;
  charge_amount: number;
  billing_code: string;
  billing_modifier: string | null;
  icd10_codes: string[];
  status: "draft" | "pending" | "submitted" | "paid" | "denied" | "void";
  charge_id: string | null;         // linked charge record if converted
  qualifying_encounter_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── CCBHC Qualifying Service Types ───────────────────────────────────────────
// Services that trigger a PPS billing day/month for a CCBHC Medicaid client

export const CCBHC_QUALIFYING_SERVICE_TYPES: string[] = [
  "individual",
  "group",
  "assessment",
  "crisis",
  "medication_management",
  "intake",
  "follow_up",
  "case_management",
  "community_support",
  "Crisis Intervention",
  "Individual Therapy",
  "Group Therapy",
  "Diagnostic Evaluation",
  "Medication Management",
  "Case Management",
  "Peer Support",
  "Community Support",
  "Substance Use Treatment",
];

// CCBHC qualifying CPT/HCPCS codes — any of these on an encounter triggers PPS
export const CCBHC_QUALIFYING_CPT_CODES = new Set([
  // Therapy
  "90832", "90834", "90837", "90838",
  // Crisis
  "90839", "90840",
  // Psych eval
  "90791", "90792",
  // Group
  "90853",
  // E/M
  "99213", "99214", "99215",
  // CCBHC-specific
  "T1015", // Comprehensive community support
  "H0031", // MH assessment
  "H2017", // Psychosocial rehab
  "H0004", // Behavioral health counseling
  "H0020", // Substance abuse treatment
  "H2014", // Skills training
  "H2015", // Community support
  "H2019", // Therapeutic behavioral
  "G0410", // Group psychotherapy (Medicare)
  "G0411", // Group psychotherapy continuation
]);

// Default PPS billing code (most states use T1015 or a state-assigned code)
export const DEFAULT_PPS_BILLING_CODE = "T1015";
export const DEFAULT_PPS_BILLING_CODE_DESC = "Comprehensive community support services, per diem (CCBHC PPS)";

// ─── PPS Calculation Helpers ──────────────────────────────────────────────────

export function isPpsQualifyingEncounter(
  encounterType: string | null | undefined,
  cptCodes?: string[],
): boolean {
  if (encounterType && CCBHC_QUALIFYING_SERVICE_TYPES.some(
    t => t.toLowerCase() === encounterType.toLowerCase()
  )) return true;
  if (cptCodes?.some(code => CCBHC_QUALIFYING_CPT_CODES.has(code))) return true;
  return false;
}

export function getPeriodKey(date: string, methodology: PpsMethodology): string {
  if (methodology === "pps1_daily") return date; // YYYY-MM-DD
  // PPS-2: YYYY-MM
  return date.slice(0, 7);
}

export function getPeriodRange(
  periodKey: string,
  methodology: PpsMethodology,
): { start: string; end: string } {
  if (methodology === "pps1_daily") {
    return { start: periodKey, end: periodKey };
  }
  // Monthly: first and last day of the month
  const [year, month] = periodKey.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export interface PpsClaimInput {
  client_id: string;
  periodKey: string;       // YYYY-MM-DD for PPS-1, YYYY-MM for PPS-2
  encounterIds: string[];
  icd10Codes: string[];
  settings: Pick<CcbhcPpsSettings, "methodology" | "daily_rate" | "monthly_rate" | "billing_code" | "billing_modifier">;
}

export function buildPpsClaim(input: PpsClaimInput): Omit<CcbhcPpsClaim,
  "id" | "organization_id" | "charge_id" | "created_at" | "updated_at"> {
  const { settings, periodKey, client_id, encounterIds, icd10Codes } = input;
  const rate = settings.methodology === "pps1_daily"
    ? (settings.daily_rate ?? 0)
    : (settings.monthly_rate ?? 0);
  const { start, end } = getPeriodRange(periodKey, settings.methodology);
  return {
    client_id,
    methodology: settings.methodology,
    period_start: start,
    period_end: end,
    rate_applied: rate,
    charge_amount: rate,
    billing_code: settings.billing_code || DEFAULT_PPS_BILLING_CODE,
    billing_modifier: settings.billing_modifier ?? null,
    icd10_codes: icd10Codes,
    status: "draft",
    qualifying_encounter_ids: encounterIds,
    notes: null,
  };
}

// ─── Label helpers ────────────────────────────────────────────────────────────

export const PPS_METHODOLOGY_LABELS: Record<PpsMethodology, string> = {
  pps1_daily: "PPS-1 (Daily Per-Diem)",
  pps2_monthly: "PPS-2 (Monthly Per-Member)",
};

export const PPS_METHODOLOGY_DESCRIPTIONS: Record<PpsMethodology, string> = {
  pps1_daily: "A fixed daily rate for each calendar day a Medicaid client receives one or more qualifying CCBHC services.",
  pps2_monthly: "A fixed monthly rate for each Medicaid client who receives at least one qualifying CCBHC service during the calendar month.",
};
