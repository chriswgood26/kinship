// HCBS Waiver Service Codes — DD/HCBS Medicaid Waiver Billing
// T-codes and H-codes for unit-based billing

export interface HcbsCode {
  code: string;
  description: string;
  unit_label: string;          // e.g. "per 15 min", "per diem", "per hour"
  unit_minutes: number | null; // null for per-diem or flat codes
  rate_per_unit: number;       // default rate (orgs can override)
  max_units_per_day: number | null;
  requires_modifier: boolean;
  category: "personal_care" | "habilitation" | "supported_employment" | "residential" | "day_services" | "behavioral" | "community_support";
}

// T-codes (CMS HCBS Waiver)
export const T_CODES: HcbsCode[] = [
  {
    code: "T1019",
    description: "Personal care services, per 15 minutes, not for an inpatient or resident of a hospital, nursing facility, ICF/MR or IMD",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 8.50,
    max_units_per_day: 32, // 8 hours
    requires_modifier: false,
    category: "personal_care",
  },
  {
    code: "T1020",
    description: "Personal care services, per diem, not for an inpatient or resident of a hospital, nursing facility, ICF/MR or IMD",
    unit_label: "per diem",
    unit_minutes: null,
    rate_per_unit: 120.00,
    max_units_per_day: 1,
    requires_modifier: false,
    category: "personal_care",
  },
  {
    code: "T2016",
    description: "Habilitation, residential, per diem",
    unit_label: "per diem",
    unit_minutes: null,
    rate_per_unit: 185.00,
    max_units_per_day: 1,
    requires_modifier: false,
    category: "residential",
  },
  {
    code: "T2019",
    description: "Day habilitation, per hour",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 6.50,
    max_units_per_day: 24, // 6 hours
    requires_modifier: false,
    category: "day_services",
  },
  {
    code: "T2020",
    description: "Day habilitation, per diem",
    unit_label: "per diem",
    unit_minutes: null,
    rate_per_unit: 110.00,
    max_units_per_day: 1,
    requires_modifier: false,
    category: "day_services",
  },
  {
    code: "T2021",
    description: "Residential habilitation, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 7.50,
    max_units_per_day: 32,
    requires_modifier: false,
    category: "residential",
  },
  {
    code: "T2025",
    description: "Supported employment, follow-along support, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 6.00,
    max_units_per_day: 16,
    requires_modifier: false,
    category: "supported_employment",
  },
  {
    code: "T2041",
    description: "Supported employment, individual, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 7.00,
    max_units_per_day: 16,
    requires_modifier: false,
    category: "supported_employment",
  },
];

// H-codes (HCBS / Behavioral Health)
export const H_CODES: HcbsCode[] = [
  {
    code: "H0043",
    description: "Supported housing, per diem",
    unit_label: "per diem",
    unit_minutes: null,
    rate_per_unit: 55.00,
    max_units_per_day: 1,
    requires_modifier: false,
    category: "residential",
  },
  {
    code: "H2014",
    description: "Skills training and development, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 9.00,
    max_units_per_day: 24,
    requires_modifier: true,
    category: "habilitation",
  },
  {
    code: "H2015",
    description: "Comprehensive community support services, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 9.50,
    max_units_per_day: 24,
    requires_modifier: true,
    category: "community_support",
  },
  {
    code: "H2016",
    description: "Comprehensive community support services, per diem",
    unit_label: "per diem",
    unit_minutes: null,
    rate_per_unit: 95.00,
    max_units_per_day: 1,
    requires_modifier: false,
    category: "community_support",
  },
  {
    code: "H2017",
    description: "Psychosocial rehabilitation services, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 8.00,
    max_units_per_day: 32,
    requires_modifier: false,
    category: "community_support",
  },
  {
    code: "H2019",
    description: "Therapeutic behavioral services, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 10.00,
    max_units_per_day: 24,
    requires_modifier: true,
    category: "behavioral",
  },
  {
    code: "H2021",
    description: "Community-based wrap-around services, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 9.00,
    max_units_per_day: 24,
    requires_modifier: false,
    category: "community_support",
  },
  {
    code: "H2023",
    description: "Supported employment, per 15 minutes",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 8.50,
    max_units_per_day: 16,
    requires_modifier: false,
    category: "supported_employment",
  },
  {
    code: "H2030",
    description: "Behavioral health hotline service",
    unit_label: "per 15 min",
    unit_minutes: 15,
    rate_per_unit: 7.50,
    max_units_per_day: 8,
    requires_modifier: false,
    category: "behavioral",
  },
];

export const ALL_HCBS_CODES: HcbsCode[] = [...T_CODES, ...H_CODES];

// Lookup by code
export const HCBS_CODE_MAP: Record<string, HcbsCode> = Object.fromEntries(
  ALL_HCBS_CODES.map(c => [c.code, c])
);

export function isHcbsCode(code: string): boolean {
  return code in HCBS_CODE_MAP;
}

// Modifier codes used with HCBS services
export const HCBS_MODIFIERS: { code: string; description: string }[] = [
  { code: "HQ", description: "Group setting" },
  { code: "HN", description: "Bachelor's degree level" },
  { code: "HO", description: "Master's degree level" },
  { code: "HP", description: "Doctoral level" },
  { code: "HM", description: "Less than bachelor's degree" },
  { code: "TF", description: "Intermediate level of care" },
  { code: "TG", description: "Complex/high tech level of care" },
  { code: "U1", description: "State-specific U1" },
  { code: "U2", description: "State-specific U2" },
  { code: "U3", description: "State-specific U3" },
  { code: "U4", description: "State-specific U4" },
  { code: "U5", description: "State-specific U5" },
  { code: "U6", description: "State-specific U6" },
  { code: "U7", description: "State-specific U7" },
  { code: "U8", description: "State-specific U8" },
];

// Category labels
export const HCBS_CATEGORY_LABELS: Record<HcbsCode["category"], string> = {
  personal_care: "Personal Care",
  habilitation: "Habilitation",
  supported_employment: "Supported Employment",
  residential: "Residential",
  day_services: "Day Services",
  behavioral: "Behavioral",
  community_support: "Community Support",
};
