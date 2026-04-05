// 2026 Federal Poverty Level Guidelines (HHS)
// https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
// Update this annually when HHS publishes new guidelines (typically January)

export const FPL_YEAR = 2026;

// Base amount for 1 person (48 contiguous states + DC)
const FPL_BASE = 15650;
// Additional per each additional person
const FPL_PER_ADDITIONAL = 5380;

// Alaska and Hawaii have higher guidelines
const FPL_BASE_AK = 19560;
const FPL_PER_ADDITIONAL_AK = 6730;
const FPL_BASE_HI = 18000;
const FPL_PER_ADDITIONAL_HI = 6190;

export type FPLState = "standard" | "alaska" | "hawaii";

export function getFPLThreshold(familySize: number, state: FPLState = "standard"): number {
  const size = Math.max(1, familySize);
  if (state === "alaska") return FPL_BASE_AK + (size - 1) * FPL_PER_ADDITIONAL_AK;
  if (state === "hawaii") return FPL_BASE_HI + (size - 1) * FPL_PER_ADDITIONAL_HI;
  return FPL_BASE + (size - 1) * FPL_PER_ADDITIONAL;
}

export function calculateFPLPercent(annualIncome: number, familySize: number, state: FPLState = "standard"): number {
  const threshold = getFPLThreshold(familySize, state);
  return Math.round((annualIncome / threshold) * 100);
}

export function getFPLLabel(fplPercent: number): string {
  if (fplPercent <= 100) return "≤100% FPL";
  if (fplPercent <= 150) return "101–150% FPL";
  if (fplPercent <= 200) return "151–200% FPL";
  if (fplPercent <= 250) return "201–250% FPL";
  if (fplPercent <= 300) return "251–300% FPL";
  return ">300% FPL";
}

// Default sliding fee tiers — org can override in settings
export interface SFSTier {
  tier: string;
  label: string;
  fpl_min: number;
  fpl_max: number;
  discount_type: "flat" | "percent" | "none";
  discount_value: number;
  description: string;
}

export const DEFAULT_SFS_TIERS: SFSTier[] = [
  { tier: "A", label: "Tier A", fpl_min: 0,   fpl_max: 100,  discount_type: "flat",    discount_value: 5,  description: "Nominal fee" },
  { tier: "B", label: "Tier B", fpl_min: 101,  fpl_max: 150,  discount_type: "flat",    discount_value: 15, description: "Reduced fee" },
  { tier: "C", label: "Tier C", fpl_min: 151,  fpl_max: 200,  discount_type: "percent", discount_value: 50, description: "50% discount" },
  { tier: "D", label: "Tier D", fpl_min: 201,  fpl_max: 250,  discount_type: "percent", discount_value: 25, description: "25% discount" },
  { tier: "E", label: "Full Pay", fpl_min: 251, fpl_max: 9999, discount_type: "none",   discount_value: 0,  description: "Full fee" },
];

export function getTierForFPL(fplPercent: number, tiers: SFSTier[]): SFSTier | null {
  return tiers.find(t => fplPercent >= t.fpl_min && fplPercent <= t.fpl_max) || null;
}

export function calculateAdjustment(chargeAmount: number, tier: SFSTier): { patientOwes: number; adjustment: number } {
  if (tier.discount_type === "flat") {
    return {
      patientOwes: Math.min(tier.discount_value, chargeAmount),
      adjustment: Math.max(0, chargeAmount - tier.discount_value),
    };
  }
  if (tier.discount_type === "percent") {
    const adjustment = Math.round((chargeAmount * tier.discount_value) / 100 * 100) / 100;
    return { patientOwes: chargeAmount - adjustment, adjustment };
  }
  return { patientOwes: chargeAmount, adjustment: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Program-area overrides, per-service overrides, grant schedules,
//          payer exclusions, and retroactive adjustment logic
// ─────────────────────────────────────────────────────────────────────────────

export const PROGRAM_AREA_OPTIONS = [
  { value: "mental_health",    label: "Mental Health" },
  { value: "substance_use",    label: "Substance Use" },
  { value: "dd",               label: "Developmental Disabilities" },
  { value: "residential",      label: "Residential" },
  { value: "primary_care",     label: "Primary Care" },
  { value: "case_management",  label: "Case Management" },
  { value: "other",            label: "Other" },
];

export const PAYER_EXCLUSION_REASONS = [
  { value: "commercial_insurance", label: "Commercial Insurance" },
  { value: "medicaid",             label: "Medicaid" },
  { value: "medicare",             label: "Medicare" },
  { value: "managed_care",         label: "Managed Care Organization" },
  { value: "chip",                 label: "CHIP" },
  { value: "other",                label: "Other" },
];

export interface SFSProgramOverride {
  id?: string;
  program_area: string;
  label: string;
  tiers: SFSTier[];
  is_active: boolean;
  notes?: string;
}

export interface SFSServiceOverride {
  id?: string;
  cpt_code: string;
  cpt_description?: string;
  override_type: "flat" | "percent" | "waive" | "full_fee";
  override_value: number;
  applies_to_fpl_max?: number | null;
  is_active: boolean;
  notes?: string;
}

export interface SFSGrantSchedule {
  id?: string;
  grant_name: string;
  grant_number?: string;
  funder?: string;
  tiers: SFSTier[];
  fpl_ceiling?: number | null;
  effective_date: string;
  expiration_date?: string | null;
  applies_to_program_areas: string[];
  is_active: boolean;
  notes?: string;
}

export interface SFSPayerExclusion {
  id?: string;
  payer_name: string;
  payer_id?: string;
  reason?: string;
  notes?: string;
  is_active: boolean;
}

export interface SFSResolutionContext {
  fplPercent: number;
  chargeAmount: number;
  cptCode?: string;
  programArea?: string;
  insuranceProvider?: string;
  serviceDate?: string; // YYYY-MM-DD
}

export type SFSScheduleSource =
  | "excluded"
  | "grant"
  | "service_override"
  | "program_override"
  | "org_default";

export interface SFSResolutionResult {
  patientOwes: number;
  adjustment: number;
  tierLabel: string;
  scheduleSource: SFSScheduleSource;
  scheduleName?: string;
  excluded: boolean;
  excludedReason?: string;
}

/**
 * Check whether a payer is in the exclusion list.
 * When excluded, SFS does not apply and the client pays the full charge.
 */
export function isPayerExcluded(
  insuranceProvider: string | null | undefined,
  payerExclusions: SFSPayerExclusion[],
): { excluded: boolean; reason?: string } {
  if (!insuranceProvider) return { excluded: false };
  const match = payerExclusions.find(
    p => p.is_active &&
      p.payer_name.trim().toLowerCase() === insuranceProvider.trim().toLowerCase(),
  );
  return match
    ? { excluded: true, reason: match.reason || match.payer_name }
    : { excluded: false };
}

/**
 * Resolve the sliding fee amount for a given charge context.
 *
 * Priority order (highest → lowest):
 *   1. Payer exclusion   — full fee, SFS does not apply
 *   2. Grant schedule    — first active grant that matches date, FPL ceiling, and program
 *   3. Service override  — CPT-code-level flat/percent/waive/full_fee override
 *   4. Program override  — program-area-specific tier table
 *   5. Org default tiers — organization's base sliding fee schedule
 */
export function resolveSFS(
  ctx: SFSResolutionContext,
  options: {
    orgTiers?: SFSTier[];
    programOverrides?: SFSProgramOverride[];
    serviceOverrides?: SFSServiceOverride[];
    grantSchedules?: SFSGrantSchedule[];
    payerExclusions?: SFSPayerExclusion[];
  } = {},
): SFSResolutionResult {
  const {
    orgTiers = DEFAULT_SFS_TIERS,
    programOverrides = [],
    serviceOverrides = [],
    grantSchedules = [],
    payerExclusions = [],
  } = options;

  // 1. Payer exclusion
  const exclusionCheck = isPayerExcluded(ctx.insuranceProvider, payerExclusions);
  if (exclusionCheck.excluded) {
    return {
      patientOwes: ctx.chargeAmount,
      adjustment: 0,
      tierLabel: "No SFS — excluded payer",
      scheduleSource: "excluded",
      excluded: true,
      excludedReason: exclusionCheck.reason,
    };
  }

  const today = ctx.serviceDate || new Date().toISOString().split("T")[0];

  // 2. Grant schedule — first active match wins
  const matchingGrant = grantSchedules.find(g => {
    if (!g.is_active || !g.tiers?.length) return false;
    if (g.effective_date > today) return false;
    if (g.expiration_date && g.expiration_date < today) return false;
    if (g.fpl_ceiling != null && ctx.fplPercent > g.fpl_ceiling) return false;
    if (
      g.applies_to_program_areas.length > 0 &&
      ctx.programArea &&
      !g.applies_to_program_areas.includes(ctx.programArea)
    ) return false;
    return true;
  });
  if (matchingGrant) {
    const tier = getTierForFPL(ctx.fplPercent, matchingGrant.tiers);
    if (tier) {
      const { patientOwes, adjustment } = calculateAdjustment(ctx.chargeAmount, tier);
      return {
        patientOwes, adjustment,
        tierLabel: tier.label,
        scheduleSource: "grant",
        scheduleName: matchingGrant.grant_name,
        excluded: false,
      };
    }
  }

  // 3. Service override (CPT-code level)
  if (ctx.cptCode) {
    const svcOverride = serviceOverrides.find(s =>
      s.is_active &&
      s.cpt_code === ctx.cptCode &&
      (s.applies_to_fpl_max == null || ctx.fplPercent <= s.applies_to_fpl_max),
    );
    if (svcOverride) {
      let patientOwes: number;
      let adjustment: number;
      if (svcOverride.override_type === "waive") {
        patientOwes = 0;
        adjustment = ctx.chargeAmount;
      } else if (svcOverride.override_type === "flat") {
        patientOwes = Math.min(svcOverride.override_value, ctx.chargeAmount);
        adjustment = Math.max(0, ctx.chargeAmount - svcOverride.override_value);
      } else if (svcOverride.override_type === "percent") {
        adjustment = Math.round(ctx.chargeAmount * svcOverride.override_value / 100 * 100) / 100;
        patientOwes = ctx.chargeAmount - adjustment;
      } else {
        // full_fee
        patientOwes = ctx.chargeAmount;
        adjustment = 0;
      }
      return {
        patientOwes, adjustment,
        tierLabel: `Service override — ${ctx.cptCode}`,
        scheduleSource: "service_override",
        scheduleName: ctx.cptCode,
        excluded: false,
      };
    }
  }

  // 4. Program-area override
  if (ctx.programArea) {
    const progOverride = programOverrides.find(
      p => p.is_active && p.program_area === ctx.programArea && p.tiers?.length > 0,
    );
    if (progOverride) {
      const tier = getTierForFPL(ctx.fplPercent, progOverride.tiers);
      if (tier) {
        const { patientOwes, adjustment } = calculateAdjustment(ctx.chargeAmount, tier);
        return {
          patientOwes, adjustment,
          tierLabel: tier.label,
          scheduleSource: "program_override",
          scheduleName: progOverride.label,
          excluded: false,
        };
      }
    }
  }

  // 5. Org default schedule
  const tier = getTierForFPL(ctx.fplPercent, orgTiers);
  if (tier) {
    const { patientOwes, adjustment } = calculateAdjustment(ctx.chargeAmount, tier);
    return {
      patientOwes, adjustment,
      tierLabel: tier.label,
      scheduleSource: "org_default",
      excluded: false,
    };
  }

  // Fallback: full fee
  return {
    patientOwes: ctx.chargeAmount,
    adjustment: 0,
    tierLabel: "Full fee",
    scheduleSource: "org_default",
    excluded: false,
  };
}

// ── Retroactive Adjustment ──────────────────────────────────────────────────

export interface RetroAdjustCharge {
  id: string;
  cpt_code: string;
  charge_amount: number;
  current_patient_responsibility?: number | null;
  program_area?: string | null;
  service_date?: string | null;
  insurance_provider?: string | null;
}

export interface RetroAdjustResult {
  charge_id: string;
  cpt_code: string;
  charge_amount: number;
  old_patient_owes: number;
  new_patient_owes: number;
  new_adjustment: number;
  delta: number; // negative = client owes less (credit), positive = owes more
}

/**
 * Given a list of pending/unpaid charges and a new FPL percent,
 * compute proposed retroactive adjustments under the new tier.
 */
export function calculateRetroactiveAdjustments(
  charges: RetroAdjustCharge[],
  newFplPercent: number,
  sfsOptions: Parameters<typeof resolveSFS>[1] = {},
): RetroAdjustResult[] {
  return charges.map(c => {
    const result = resolveSFS(
      {
        fplPercent: newFplPercent,
        chargeAmount: c.charge_amount,
        cptCode: c.cpt_code,
        programArea: c.program_area ?? undefined,
        serviceDate: c.service_date ?? undefined,
        insuranceProvider: c.insurance_provider ?? undefined,
      },
      sfsOptions,
    );
    const oldOwes = c.current_patient_responsibility ?? c.charge_amount;
    return {
      charge_id: c.id,
      cpt_code: c.cpt_code,
      charge_amount: c.charge_amount,
      old_patient_owes: oldOwes,
      new_patient_owes: result.patientOwes,
      new_adjustment: result.adjustment,
      delta: result.patientOwes - oldOwes,
    };
  });
}
