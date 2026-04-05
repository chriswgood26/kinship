// Medicaid/Medicare payer-specific billing rules
// Extends the core billing rules engine with government payer validation

import { ChargeInput, RuleResult } from "./billingRules";

// ── Payer Type ──────────────────────────────────────────────────────────────

export type PayerType =
  | "medicaid"
  | "medicare"
  | "medicare_advantage"
  | "commercial"
  | "self_pay"
  | "unknown";

export const PAYER_TYPE_LABELS: Record<PayerType, string> = {
  medicaid: "Medicaid",
  medicare: "Medicare (Traditional)",
  medicare_advantage: "Medicare Advantage",
  commercial: "Commercial Insurance",
  self_pay: "Self-Pay / Private Pay",
  unknown: "Unknown Payer",
};

export const PAYER_TYPE_COLORS: Record<PayerType, string> = {
  medicaid:           "bg-blue-100 text-blue-700 border-blue-200",
  medicare:           "bg-red-100 text-red-700 border-red-200",
  medicare_advantage: "bg-orange-100 text-orange-700 border-orange-200",
  commercial:         "bg-slate-100 text-slate-600 border-slate-200",
  self_pay:           "bg-teal-100 text-teal-700 border-teal-200",
  unknown:            "bg-slate-50 text-slate-400 border-slate-100",
};

// ── Detection Patterns ──────────────────────────────────────────────────────

// Check Medicare Advantage BEFORE Medicare — MA plan names often contain "Medicare"
const MEDICARE_ADVANTAGE_PATTERNS: RegExp[] = [
  /medicare advantage/i,
  /\bma plan\b/i,
  /\bmapd\b/i,
  /aarp medicare/i,
  /humana gold/i,
  /humana medicare/i,
  /cigna.*medicare/i,
  /regence.*medicare/i,
  /moda.*medicare/i,
  /kaiser.*medicare/i,
  /providence.*medicare advantage/i,
  /bcbs.*medicare/i,
  /anthem.*medicare/i,
  /united.*medicare/i,
  /wellmed/i,
];

const MEDICARE_PATTERNS: RegExp[] = [
  /\bmedicare\b/i,
  /noridian/i,
  /palmetto gba/i,
  /novitas/i,
  /wps medicare/i,
  /first coast service/i,
  /\bcms[\s-]?1500\b/i,
];

const MEDICAID_PATTERNS: RegExp[] = [
  /medicaid/i,
  /\bohp\b/i,
  /oregon health plan/i,
  /medi-cal/i,
  /masshealth/i,
  /tenncare/i,
  /ahcccs/i,
  /coordinated care/i,
  /trillium community/i,
  /jackson care connect/i,
  /yamhill ccof/i,
  /columbia pacific cco/i,
  /eastern oregon cco/i,
  /allcare cco/i,
  /aetna better health/i,
  /united healthcare community/i,
  /uhc community plan/i,
  /molina healthcare/i,
  /wellcare health/i,
  /amerigroup/i,
  /caresource/i,
  /buckeye health/i,
  /meridian health plan/i,
  /healthfirst/i,
  /fidelis care/i,
  /centene/i,
  /sunshine health/i,
  /simply health/i,
];

const SELF_PAY_PATTERNS: RegExp[] = [
  /self.?pay/i,
  /private pay/i,
  /self.?funded/i,
  /out.?of.?pocket/i,
  /uninsured/i,
];

/**
 * Classify an insurance provider name into a payer type.
 * Used to apply payer-specific billing rules.
 */
export function detectPayerType(insuranceProvider: string | undefined | null): PayerType {
  if (!insuranceProvider || insuranceProvider.trim() === "") return "unknown";

  // Check MA before Medicare (MA names contain "medicare")
  for (const re of MEDICARE_ADVANTAGE_PATTERNS) {
    if (re.test(insuranceProvider)) return "medicare_advantage";
  }
  for (const re of MEDICARE_PATTERNS) {
    if (re.test(insuranceProvider)) return "medicare";
  }
  for (const re of MEDICAID_PATTERNS) {
    if (re.test(insuranceProvider)) return "medicaid";
  }
  for (const re of SELF_PAY_PATTERNS) {
    if (re.test(insuranceProvider)) return "self_pay";
  }
  return "commercial";
}

// ── Code Sets ───────────────────────────────────────────────────────────────

/**
 * Returns true for HCPCS H-codes and T-codes.
 * These are Medicaid-only codes and are NOT covered by Medicare or most commercial plans.
 */
function isMedicaidOnlyCode(cptCode: string): boolean {
  return /^[HT]\d/.test(cptCode);
}

// Behavioral health CPT codes that Medicaid MCO/CCOs typically require service auth for
const MEDICAID_AUTH_REQUIRED_CODES = new Set([
  "90791", "90792",
  "90839", "90840",
  "99492", "99493", "99494",
  "H0031", "H0004", "H0020", "H0001",
]);

// CPT codes eligible for Medicare telehealth
// Medicare requires GT (synchronous telehealth) or 95 (real-time audio/video) modifier
const MEDICARE_TELEHEALTH_ELIGIBLE = new Set([
  "90791", "90792",
  "90832", "90834", "90837", "90838",
  "90839", "90840",
  "90845", "90846", "90847", "90849", "90853",
  "99213", "99214", "99215",
  "99492", "99493", "99494",
]);

// Therapy CPT codes requiring functional limitation documentation under Medicare
const MEDICARE_THERAPY_CODES = new Set([
  "90832", "90834", "90837",
  "97110", "97112", "97116", "97530", "97535",
]);

// ── Medicaid Rules ──────────────────────────────────────────────────────────

// Medicaid timely filing is typically 365 days (some states/MCOs are shorter)
const MEDICAID_TIMELY_FILING_DAYS = 365;
const MEDICAID_FILING_WARNING_DAYS = 270; // warn at 9 months

function validateMedicaidRules(charge: ChargeInput): RuleResult[] {
  const results: RuleResult[] = [];
  const daysSince = Math.round(
    (Date.now() - new Date(charge.service_date + "T12:00:00").getTime()) / 86400000
  );

  // MC001 — Service authorization for high-acuity codes
  if (MEDICAID_AUTH_REQUIRED_CODES.has(charge.cpt_code) && !charge.auth_number) {
    results.push({
      code: "MC001",
      severity: "warning",
      field: "auth_number",
      message: `Medicaid MCO/CCOs typically require a service authorization for CPT ${charge.cpt_code}. Verify with the plan before submitting.`,
    });
  }

  // MC002 — H-code / T-code eligibility confirmation
  if (isMedicaidOnlyCode(charge.cpt_code)) {
    results.push({
      code: "MC002",
      severity: "info",
      message: `${charge.cpt_code} is a Medicaid-specific HCPCS code. Confirm the client is actively enrolled in a Medicaid/OHP plan for the date of service.`,
    });
  }

  // MC003 — Timely filing
  if (daysSince > MEDICAID_TIMELY_FILING_DAYS) {
    results.push({
      code: "MC003",
      severity: "error",
      field: "service_date",
      message: `Charge is ${daysSince} days old and likely exceeds the Medicaid timely filing limit (typically 365 days). Verify with the MCO/state if a late exception applies.`,
    });
  } else if (daysSince > MEDICAID_FILING_WARNING_DAYS) {
    results.push({
      code: "MC003",
      severity: "warning",
      field: "service_date",
      message: `Charge is ${daysSince} days old. Medicaid timely filing limits are typically 365 days — submit soon to avoid denial.`,
    });
  }

  // MC004 — Enrollment verification reminder
  results.push({
    code: "MC004",
    severity: "info",
    message:
      "Medicaid: Verify that both client and provider are actively enrolled in the Medicaid plan for this date of service before submitting.",
  });

  return results;
}

// ── Medicare Rules ──────────────────────────────────────────────────────────

// Medicare timely filing: 1 calendar year from date of service
const MEDICARE_TIMELY_FILING_DAYS = 365;
const MEDICARE_FILING_WARNING_DAYS = 300; // warn at ~10 months

function validateMedicareRules(charge: ChargeInput): RuleResult[] {
  const results: RuleResult[] = [];
  const daysSince = Math.round(
    (Date.now() - new Date(charge.service_date + "T12:00:00").getTime()) / 86400000
  );

  // MR001 — H-codes and T-codes are not covered by Medicare
  if (isMedicaidOnlyCode(charge.cpt_code)) {
    results.push({
      code: "MR001",
      severity: "error",
      field: "cpt_code",
      message: `${charge.cpt_code} is a Medicaid-only HCPCS code and is not covered by Medicare. Use a Medicare-approved procedure code (e.g., 90837, 90791) for this payer.`,
    });
  }

  // MR002 — Telehealth modifier (GT or 95) for telehealth-eligible codes
  if (MEDICARE_TELEHEALTH_ELIGIBLE.has(charge.cpt_code) && !charge.modifier) {
    results.push({
      code: "MR002",
      severity: "info",
      field: "modifier",
      message: `If this service was delivered via telehealth, Medicare requires modifier GT (synchronous telehealth) or 95 (real-time audio/video). Add the appropriate modifier if applicable.`,
    });
  }

  // MR003 — Timely filing (1 year)
  if (daysSince > MEDICARE_TIMELY_FILING_DAYS) {
    results.push({
      code: "MR003",
      severity: "error",
      field: "service_date",
      message: `Charge is ${daysSince} days old and exceeds Medicare's 1-year timely filing limit. This claim will likely be denied without an exception (e.g., retroactive eligibility or administrative error).`,
    });
  } else if (daysSince > MEDICARE_FILING_WARNING_DAYS) {
    results.push({
      code: "MR003",
      severity: "warning",
      field: "service_date",
      message: `Charge is ${daysSince} days old. Medicare requires claims within 1 calendar year of the service date — submit promptly.`,
    });
  }

  // MR004 — Functional limitation documentation for therapy codes
  if (MEDICARE_THERAPY_CODES.has(charge.cpt_code)) {
    results.push({
      code: "MR004",
      severity: "info",
      message: `Medicare therapy services require functional limitation documentation (G-code or functional limitation reporting). Ensure the clinical record documents functional status and progress toward goals.`,
    });
  }

  // MR005 — Prior auth for psych evals (may apply under Medicare Advantage, informational for traditional)
  if (
    (charge.cpt_code === "90791" || charge.cpt_code === "90792") &&
    !charge.auth_number
  ) {
    results.push({
      code: "MR005",
      severity: "info",
      field: "auth_number",
      message: `Psychiatric diagnostic evaluations (${charge.cpt_code}) do not require prior auth under traditional Medicare, but verify if the client has a supplement or secondary payer.`,
    });
  }

  return results;
}

// ── Medicare Advantage Rules ────────────────────────────────────────────────

function validateMedicareAdvantageRules(charge: ChargeInput): RuleResult[] {
  const results: RuleResult[] = [];

  // MAR001 — H/T-codes not covered (same as traditional Medicare)
  if (isMedicaidOnlyCode(charge.cpt_code)) {
    results.push({
      code: "MAR001",
      severity: "error",
      field: "cpt_code",
      message: `${charge.cpt_code} is a Medicaid HCPCS code and is not covered by Medicare Advantage plans. Use a Medicare-approved procedure code.`,
    });
  }

  // MAR002 — PA is common in MA plans
  if (!charge.auth_number) {
    results.push({
      code: "MAR002",
      severity: "warning",
      field: "auth_number",
      message: `Medicare Advantage plans frequently require prior authorization for behavioral health services. Confirm authorization requirements with the specific plan before submitting.`,
    });
  }

  // MAR003 — Telehealth modifier reminder (same as traditional Medicare)
  if (MEDICARE_TELEHEALTH_ELIGIBLE.has(charge.cpt_code) && !charge.modifier) {
    results.push({
      code: "MAR003",
      severity: "info",
      field: "modifier",
      message: `If this was a telehealth service, add modifier GT (synchronous) or 95 (real-time audio/video). Medicare Advantage plans follow CMS telehealth guidelines.`,
    });
  }

  return results;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run payer-specific billing rules for a given charge and detected payer type.
 * Returns an array of RuleResults to be merged into the core ValidationResult.
 */
export function validatePayerSpecificRules(
  charge: ChargeInput,
  payerType: PayerType
): RuleResult[] {
  switch (payerType) {
    case "medicaid":
      return validateMedicaidRules(charge);
    case "medicare":
      return validateMedicareRules(charge);
    case "medicare_advantage":
      return validateMedicareAdvantageRules(charge);
    default:
      return [];
  }
}
