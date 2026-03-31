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
