// Billing Rules Engine — DrCloud Neo
// Validates charges before submission to reduce denials

export interface ChargeInput {
  client_id: string;
  service_date: string;
  cpt_code: string;
  icd10_codes: string[];
  units: number;
  charge_amount?: number;
  insurance_provider?: string;
  auth_number?: string;
}

export interface RuleResult {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: RuleResult[];
  warnings: RuleResult[];
  infos: RuleResult[];
}

// CPT codes that REQUIRE a mental health ICD-10 diagnosis
const MH_CPT_CODES = new Set([
  "90832", "90834", "90837", "90838", "90839", "90840",
  "90845", "90846", "90847", "90849", "90853",
  "90791", "90792", "99492", "99493", "99494",
  "H0031", "H2017", "H0004", "H0020",
]);

// Mental health ICD-10 prefixes
const MH_ICD10_PREFIXES = ["F", "Z03", "Z13"];

// CPT codes that require prior authorization for most payers
const AUTH_REQUIRED_CPTS = new Set([
  "90791", "90792", "90839", "90840", "H0031",
  "99492", "99493", "99494",
]);

// Payer-specific session limits (sessions per year before PA required)
const PAYER_SESSION_LIMITS: Record<string, number> = {
  "Regence BlueShield of Oregon": 30,
  "Kaiser Permanente NW": 20,
  "Providence Health Plan": 26,
  "Oregon Health Plan (Medicaid)": 999, // OHP has no hard limit
  "PacificSource Health Plans": 30,
  "Moda Health": 24,
  "Aetna Better Health of Oregon": 999,
};

// Valid CPT + place of service combinations
const VALID_CPT_UNITS: Record<string, { max: number; label: string }> = {
  "90832": { max: 1, label: "30-min therapy (1 unit)" },
  "90834": { max: 1, label: "45-min therapy (1 unit)" },
  "90837": { max: 1, label: "60-min therapy (1 unit)" },
  "90853": { max: 1, label: "Group therapy (1 unit)" },
  "90791": { max: 1, label: "Diagnostic eval (1 unit)" },
  "90792": { max: 1, label: "Diagnostic eval w/med (1 unit)" },
  "H0031": { max: 1, label: "MH assessment (1 unit)" },
  "H2017": { max: 8, label: "Psychosocial rehab (max 8 units/day)" },
  "99213": { max: 1, label: "Office visit (1 unit)" },
  "99214": { max: 1, label: "Office visit (1 unit)" },
};

export function validateCharge(charge: ChargeInput): ValidationResult {
  const errors: RuleResult[] = [];
  const warnings: RuleResult[] = [];
  const infos: RuleResult[] = [];

  // Rule 1: Mental health CPT requires mental health diagnosis
  if (MH_CPT_CODES.has(charge.cpt_code)) {
    const hasMHDiag = charge.icd10_codes.some(code =>
      MH_ICD10_PREFIXES.some(prefix => code.startsWith(prefix))
    );
    if (!hasMHDiag) {
      errors.push({
        code: "BL001",
        severity: "error",
        field: "icd10_codes",
        message: `CPT ${charge.cpt_code} requires a mental health diagnosis (F00-F99). No qualifying ICD-10 code found.`,
      });
    }
  }

  // Rule 2: Prior auth recommended for high-cost CPTs
  if (AUTH_REQUIRED_CPTS.has(charge.cpt_code) && !charge.auth_number) {
    warnings.push({
      code: "BL002",
      severity: "warning",
      field: "auth_number",
      message: `CPT ${charge.cpt_code} typically requires prior authorization. Consider adding an auth number before submitting.`,
    });
  }

  // Rule 3: Units validation
  const unitRule = VALID_CPT_UNITS[charge.cpt_code];
  if (unitRule && charge.units > unitRule.max) {
    errors.push({
      code: "BL003",
      severity: "error",
      field: "units",
      message: `CPT ${charge.cpt_code} (${unitRule.label}): ${charge.units} units exceeds maximum of ${unitRule.max}.`,
    });
  }

  // Rule 4: Missing diagnosis codes
  if (!charge.icd10_codes || charge.icd10_codes.length === 0) {
    errors.push({
      code: "BL004",
      severity: "error",
      field: "icd10_codes",
      message: "At least one ICD-10 diagnosis code is required for claim submission.",
    });
  }

  // Rule 5: Max 4 diagnosis codes per claim
  if (charge.icd10_codes && charge.icd10_codes.length > 4) {
    warnings.push({
      code: "BL005",
      severity: "warning",
      field: "icd10_codes",
      message: `${charge.icd10_codes.length} diagnosis codes found. Most payers accept a maximum of 4 per claim.`,
    });
  }

  // Rule 6: Payer session limit info
  if (charge.insurance_provider) {
    const limit = PAYER_SESSION_LIMITS[charge.insurance_provider];
    if (limit && limit < 999) {
      infos.push({
        code: "BL006",
        severity: "info",
        message: `${charge.insurance_provider} allows up to ${limit} sessions/year before prior auth required.`,
      });
    }
  }

  // Rule 7: Future service date
  if (charge.service_date > new Date().toISOString().split("T")[0]) {
    errors.push({
      code: "BL007",
      severity: "error",
      field: "service_date",
      message: "Service date cannot be in the future.",
    });
  }

  // Rule 8: Timely filing warning (> 90 days old)
  const serviceDate = new Date(charge.service_date + "T12:00:00");
  const daysSince = Math.round((Date.now() - serviceDate.getTime()) / 86400000);
  if (daysSince > 90) {
    warnings.push({
      code: "BL008",
      severity: "warning",
      field: "service_date",
      message: `Charge is ${daysSince} days old. Many payers have 90-180 day timely filing limits. Submit promptly.`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}

export function summarizeValidation(results: ValidationResult[]): {
  totalErrors: number;
  totalWarnings: number;
  cleanCharges: number;
  errorCodes: Record<string, number>;
} {
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  const totalWarnings = results.reduce((s, r) => s + r.warnings.length, 0);
  const cleanCharges = results.filter(r => r.valid && r.warnings.length === 0).length;
  const errorCodes: Record<string, number> = {};
  results.forEach(r => {
    [...r.errors, ...r.warnings].forEach(e => {
      errorCodes[e.code] = (errorCodes[e.code] || 0) + 1;
    });
  });
  return { totalErrors, totalWarnings, cleanCharges, errorCodes };
}
