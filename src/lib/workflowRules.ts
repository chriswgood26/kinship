// Workflow Rules Engine — Kinship EHR
// Configurable business rules for clinical workflows

// ─── Trigger Types ────────────────────────────────────────────────────────────

export type WorkflowTrigger =
  | "encounter_created"
  | "encounter_signed"
  | "note_created"
  | "note_unsigned_48h"
  | "note_unsigned_72h"
  | "client_admitted"
  | "client_discharged"
  | "appointment_scheduled"
  | "appointment_no_show"
  | "auth_expiring_30d"
  | "auth_expiring_7d"
  | "auth_expired"
  | "claim_denied"
  | "claim_submitted"
  | "assessment_due"
  | "treatment_plan_due"
  | "referral_received"
  | "incident_reported"
  | "screening_high_risk";

export const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  encounter_created:     "Encounter Created",
  encounter_signed:      "Encounter Signed",
  note_created:          "Clinical Note Created",
  note_unsigned_48h:     "Note Unsigned After 48 Hours",
  note_unsigned_72h:     "Note Unsigned After 72 Hours",
  client_admitted:       "Client Admitted",
  client_discharged:     "Client Discharged",
  appointment_scheduled: "Appointment Scheduled",
  appointment_no_show:   "Appointment No-Show",
  auth_expiring_30d:     "Authorization Expiring in 30 Days",
  auth_expiring_7d:      "Authorization Expiring in 7 Days",
  auth_expired:          "Authorization Expired",
  claim_denied:          "Claim Denied",
  claim_submitted:       "Claim Submitted",
  assessment_due:        "Assessment Due",
  treatment_plan_due:    "Treatment Plan Review Due",
  referral_received:     "Referral Received",
  incident_reported:     "Incident Reported",
  screening_high_risk:   "High-Risk Screening Result",
};

export const TRIGGER_GROUPS: { label: string; triggers: WorkflowTrigger[] }[] = [
  {
    label: "Encounters & Notes",
    triggers: ["encounter_created", "encounter_signed", "note_created", "note_unsigned_48h", "note_unsigned_72h"],
  },
  {
    label: "Client Events",
    triggers: ["client_admitted", "client_discharged", "referral_received", "incident_reported", "screening_high_risk"],
  },
  {
    label: "Scheduling",
    triggers: ["appointment_scheduled", "appointment_no_show"],
  },
  {
    label: "Billing & Authorizations",
    triggers: ["auth_expiring_30d", "auth_expiring_7d", "auth_expired", "claim_submitted", "claim_denied"],
  },
  {
    label: "Care Management",
    triggers: ["assessment_due", "treatment_plan_due"],
  },
];

// ─── Condition Types ──────────────────────────────────────────────────────────

export type ConditionField =
  | "program_id"
  | "service_type"
  | "payer"
  | "provider_role"
  | "client_status"
  | "org_type"
  | "screening_type"
  | "note_type"
  | "days_since"
  | "claim_denial_code";

export type ConditionOperator = "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in";

export interface WorkflowCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | string[];
}

export const CONDITION_FIELD_LABELS: Record<ConditionField, string> = {
  program_id:          "Program",
  service_type:        "Service Type",
  payer:               "Payer",
  provider_role:       "Provider Role",
  client_status:       "Client Status",
  org_type:            "Organization Type",
  screening_type:      "Screening Type",
  note_type:           "Note Type",
  days_since:          "Days Since Event",
  claim_denial_code:   "Claim Denial Code",
};

// ─── Action Types ─────────────────────────────────────────────────────────────

export type WorkflowActionType =
  | "notify_admin"
  | "notify_provider"
  | "notify_supervisor"
  | "notify_billing"
  | "flag_chart"
  | "require_supervisor_review"
  | "block_encounter_sign"
  | "send_email"
  | "send_sms"
  | "create_task"
  | "add_chart_alert";

export const ACTION_LABELS: Record<WorkflowActionType, string> = {
  notify_admin:               "Notify Admin",
  notify_provider:            "Notify Provider",
  notify_supervisor:          "Notify Supervisor",
  notify_billing:             "Notify Billing Team",
  flag_chart:                 "Flag Client Chart",
  require_supervisor_review:  "Require Supervisor Review",
  block_encounter_sign:       "Block Encounter Signing",
  send_email:                 "Send Email",
  send_sms:                   "Send SMS",
  create_task:                "Create Task",
  add_chart_alert:            "Add Chart Alert",
};

export const ACTION_COLORS: Record<WorkflowActionType, string> = {
  notify_admin:              "bg-blue-50 text-blue-700",
  notify_provider:           "bg-teal-50 text-teal-700",
  notify_supervisor:         "bg-violet-50 text-violet-700",
  notify_billing:            "bg-amber-50 text-amber-700",
  flag_chart:                "bg-red-50 text-red-700",
  require_supervisor_review: "bg-violet-50 text-violet-700",
  block_encounter_sign:      "bg-red-50 text-red-700",
  send_email:                "bg-sky-50 text-sky-700",
  send_sms:                  "bg-green-50 text-green-700",
  create_task:               "bg-orange-50 text-orange-700",
  add_chart_alert:           "bg-rose-50 text-rose-700",
};

export interface WorkflowAction {
  type: WorkflowActionType;
  /** Optional message/note to include in notification/alert */
  message?: string;
  /** For create_task: task title */
  task_title?: string;
  /** For send_email / send_sms: recipient override */
  recipient_role?: string;
}

// ─── Rule Definition ──────────────────────────────────────────────────────────

export interface WorkflowRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  is_active: boolean;
  priority: number; // lower = higher priority
  created_at: string;
  updated_at: string;
  created_by_clerk_id: string | null;
}

// ─── Evaluation Context ────────────────────────────────────────────────────────

export interface RuleContext {
  trigger: WorkflowTrigger;
  program_id?: string;
  service_type?: string;
  payer?: string;
  provider_role?: string;
  client_status?: string;
  org_type?: string;
  screening_type?: string;
  note_type?: string;
  days_since?: number;
  claim_denial_code?: string;
  [key: string]: unknown;
}

// ─── Rule Evaluation ──────────────────────────────────────────────────────────

function evaluateCondition(condition: WorkflowCondition, ctx: RuleContext): boolean {
  const ctxValue = ctx[condition.field];
  const { operator, value } = condition;

  if (ctxValue === undefined || ctxValue === null) return false;

  switch (operator) {
    case "equals":
      return String(ctxValue) === String(value);
    case "not_equals":
      return String(ctxValue) !== String(value);
    case "contains":
      return String(ctxValue).toLowerCase().includes(String(value).toLowerCase());
    case "greater_than":
      return Number(ctxValue) > Number(value);
    case "less_than":
      return Number(ctxValue) < Number(value);
    case "in":
      return Array.isArray(value) ? value.map(String).includes(String(ctxValue)) : false;
    default:
      return false;
  }
}

export interface RuleEvaluationResult {
  rule: WorkflowRule;
  matched: boolean;
  actions: WorkflowAction[];
}

/**
 * Evaluate a set of workflow rules against a context.
 * Returns only the rules that matched (trigger + all conditions).
 */
export function evaluateRules(
  rules: WorkflowRule[],
  ctx: RuleContext
): RuleEvaluationResult[] {
  return rules
    .filter(r => r.is_active && r.trigger === ctx.trigger)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
    .map(rule => {
      const conditionsMet =
        rule.conditions.length === 0 ||
        rule.conditions.every(c => evaluateCondition(c, ctx));
      return {
        rule,
        matched: conditionsMet,
        actions: conditionsMet ? rule.actions : [],
      };
    })
    .filter(r => r.matched);
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

export function summarizeRules(rules: WorkflowRule[]): {
  total: number;
  active: number;
  inactive: number;
  byTrigger: Record<string, number>;
} {
  const active = rules.filter(r => r.is_active).length;
  const byTrigger: Record<string, number> = {};
  rules.forEach(r => {
    byTrigger[r.trigger] = (byTrigger[r.trigger] || 0) + 1;
  });
  return { total: rules.length, active, inactive: rules.length - active, byTrigger };
}
