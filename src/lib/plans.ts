// Kinship EHR — Plan Feature Matrix

export type Plan = "starter" | "growth" | "practice" | "agency" | "custom";

export interface PlanFeatures {
  maxUsers: number;
  storageGB: number;
  // Core (all plans)
  clients: boolean;
  scheduling: boolean;
  encounters: boolean;
  billing: boolean;
  portal: boolean;
  // Growth+
  ccbhc: boolean;
  assessments: boolean;
  supervisorReview: boolean;
  treatmentPlans: boolean;
  // Practice+
  emar: boolean;
  ddModules: boolean; // ISP, incidents, DD progress notes
  bedManagement: boolean;
  priorAuth: boolean;
  advancedReports: boolean;
  // Agency+
  multiLocation: boolean;
  sla: boolean;
  // Add-ons (separate)
  smsReminders: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  starter: {
    maxUsers: 5, storageGB: 5,
    clients: true, scheduling: true, encounters: true, billing: true, portal: true,
    ccbhc: false, assessments: false, supervisorReview: false, treatmentPlans: false,
    emar: false, ddModules: false, bedManagement: false, priorAuth: false, advancedReports: false,
    multiLocation: false, sla: false, smsReminders: false,
  },
  growth: {
    maxUsers: 15, storageGB: 20,
    clients: true, scheduling: true, encounters: true, billing: true, portal: true,
    ccbhc: true, assessments: true, supervisorReview: true, treatmentPlans: true,
    emar: false, ddModules: false, bedManagement: false, priorAuth: false, advancedReports: false,
    multiLocation: false, sla: false, smsReminders: false,
  },
  practice: {
    maxUsers: 30, storageGB: 30,
    clients: true, scheduling: true, encounters: true, billing: true, portal: true,
    ccbhc: true, assessments: true, supervisorReview: true, treatmentPlans: true,
    emar: true, ddModules: true, bedManagement: true, priorAuth: true, advancedReports: true,
    multiLocation: false, sla: false, smsReminders: false,
  },
  agency: {
    maxUsers: 50, storageGB: 50,
    clients: true, scheduling: true, encounters: true, billing: true, portal: true,
    ccbhc: true, assessments: true, supervisorReview: true, treatmentPlans: true,
    emar: true, ddModules: true, bedManagement: true, priorAuth: true, advancedReports: true,
    multiLocation: true, sla: true, smsReminders: false,
  },
  custom: {
    maxUsers: 9999, storageGB: 999,
    clients: true, scheduling: true, encounters: true, billing: true, portal: true,
    ccbhc: true, assessments: true, supervisorReview: true, treatmentPlans: true,
    emar: true, ddModules: true, bedManagement: true, priorAuth: true, advancedReports: true,
    multiLocation: true, sla: true, smsReminders: true,
  },
};

export const PLAN_PRICES: Record<Plan, { monthly: number; annual: number }> = {
  starter:  { monthly: 149,  annual: 1430 },
  growth:   { monthly: 349,  annual: 3350 },
  practice: { monthly: 599,  annual: 5750 },
  agency:   { monthly: 899,  annual: 8630 },
  custom:   { monthly: 0,    annual: 0 },
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter",
  growth: "Growth",
  practice: "Practice",
  agency: "Agency",
  custom: "Custom",
};

export function getFeatures(plan: string | null | undefined, addons?: string[]): PlanFeatures {
  const base = PLAN_FEATURES[(plan as Plan) || "starter"] || PLAN_FEATURES.starter;
  const addonsSet = new Set(addons || []);
  return {
    ...base,
    smsReminders: base.smsReminders || addonsSet.has("sms"),
    ccbhc: base.ccbhc || addonsSet.has("ccbhc"),
    emar: base.emar || addonsSet.has("emar"),
    ddModules: base.ddModules || addonsSet.has("dd"),
  };
}

export function hasFeature(plan: string | null | undefined, feature: keyof PlanFeatures, addons?: string[]): boolean {
  return getFeatures(plan, addons)[feature] === true;
}
