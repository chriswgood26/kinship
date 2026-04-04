// Client-safe constants for the communications automation engine
// (No Node.js-only imports — safe to use in client components)

export type CommEventTrigger =
  | "appointment_scheduled"
  | "appointment_reminder_24h"
  | "appointment_reminder_1h"
  | "appointment_cancelled"
  | "appointment_no_show"
  | "intake_completed"
  | "discharge_completed"
  | "treatment_plan_due"
  | "birthday";

export const TRIGGER_LABELS: Record<CommEventTrigger, string> = {
  appointment_scheduled: "Appointment Scheduled (confirmation)",
  appointment_reminder_24h: "Appointment Reminder — 24 hours before",
  appointment_reminder_1h: "Appointment Reminder — 1 hour before",
  appointment_cancelled: "Appointment Cancelled",
  appointment_no_show: "No-Show Follow-up",
  intake_completed: "Intake Completed",
  discharge_completed: "Discharge Completed",
  treatment_plan_due: "Treatment Plan Due for Review",
  birthday: "Client Birthday",
};

export const TEMPLATE_VARIABLES = [
  { key: "client_first_name", label: "Client First Name" },
  { key: "client_last_name", label: "Client Last Name" },
  { key: "client_full_name", label: "Client Full Name" },
  { key: "client_preferred_name", label: "Client Preferred Name" },
  { key: "appointment_date", label: "Appointment Date" },
  { key: "appointment_time", label: "Appointment Time" },
  { key: "appointment_type", label: "Appointment Type" },
  { key: "org_name", label: "Organization Name" },
  { key: "org_phone", label: "Organization Phone" },
  { key: "clinician_name", label: "Clinician Name" },
  { key: "opt_out_text", label: "Opt-Out Text (auto-appended to SMS)" },
];
