-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Enforcement — Row Level Security on all PHI-containing tables
-- Defense-in-depth: app uses service role (bypasses RLS), but these policies
-- ensure any anon/user-key access is strictly scoped to the authenticated org.
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure the auth_org_id() helper exists (originally defined in schema.sql)
create or replace function auth_org_id() returns uuid
  language sql stable security definer
as $$
  select organization_id
  from user_profiles
  where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
  limit 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tables with RLS NOT YET ENABLED
-- ─────────────────────────────────────────────────────────────────────────────

-- encounter_appointment_types (org-specific config)
alter table encounter_appointment_types enable row level security;
create policy "org_enc_appt_types_select" on encounter_appointment_types
  for select using (organization_id = auth_org_id());
create policy "org_enc_appt_types_insert" on encounter_appointment_types
  for insert with check (organization_id = auth_org_id());
create policy "org_enc_appt_types_update" on encounter_appointment_types
  for update using (organization_id = auth_org_id());
create policy "org_enc_appt_types_delete" on encounter_appointment_types
  for delete using (organization_id = auth_org_id());

-- feedback (org-scoped staff feedback)
alter table feedback enable row level security;
create policy "org_feedback_select" on feedback
  for select using (organization_id = auth_org_id());
create policy "org_feedback_insert" on feedback
  for insert with check (organization_id = auth_org_id());
create policy "org_feedback_update" on feedback
  for update using (organization_id = auth_org_id());

-- appointment_reminder_log (org-scoped, contains appointment references)
alter table appointment_reminder_log enable row level security;
create policy "org_reminder_log_select" on appointment_reminder_log
  for select using (organization_id = auth_org_id());
create policy "org_reminder_log_insert" on appointment_reminder_log
  for insert with check (organization_id = auth_org_id());

-- ccbhc_pps_settings (org billing config)
alter table ccbhc_pps_settings enable row level security;
create policy "org_ccbhc_pps_settings_select" on ccbhc_pps_settings
  for select using (organization_id = auth_org_id());
create policy "org_ccbhc_pps_settings_insert" on ccbhc_pps_settings
  for insert with check (organization_id = auth_org_id());
create policy "org_ccbhc_pps_settings_update" on ccbhc_pps_settings
  for update using (organization_id = auth_org_id());

-- ccbhc_pps_claims (PHI — contains client_id)
alter table ccbhc_pps_claims enable row level security;
create policy "org_ccbhc_pps_claims_select" on ccbhc_pps_claims
  for select using (organization_id = auth_org_id());
create policy "org_ccbhc_pps_claims_insert" on ccbhc_pps_claims
  for insert with check (organization_id = auth_org_id());
create policy "org_ccbhc_pps_claims_update" on ccbhc_pps_claims
  for update using (organization_id = auth_org_id());
create policy "org_ccbhc_pps_claims_delete" on ccbhc_pps_claims
  for delete using (organization_id = auth_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS enabled but MISSING policies (comm_* tables)
-- ─────────────────────────────────────────────────────────────────────────────

create policy "org_comm_templates_select" on comm_templates
  for select using (organization_id = auth_org_id());
create policy "org_comm_templates_insert" on comm_templates
  for insert with check (organization_id = auth_org_id());
create policy "org_comm_templates_update" on comm_templates
  for update using (organization_id = auth_org_id());
create policy "org_comm_templates_delete" on comm_templates
  for delete using (organization_id = auth_org_id());

create policy "org_comm_rules_select" on comm_rules
  for select using (organization_id = auth_org_id());
create policy "org_comm_rules_insert" on comm_rules
  for insert with check (organization_id = auth_org_id());
create policy "org_comm_rules_update" on comm_rules
  for update using (organization_id = auth_org_id());
create policy "org_comm_rules_delete" on comm_rules
  for delete using (organization_id = auth_org_id());

create policy "org_comm_opt_outs_select" on comm_opt_outs
  for select using (organization_id = auth_org_id());
create policy "org_comm_opt_outs_insert" on comm_opt_outs
  for insert with check (organization_id = auth_org_id());
create policy "org_comm_opt_outs_update" on comm_opt_outs
  for update using (organization_id = auth_org_id());
create policy "org_comm_opt_outs_delete" on comm_opt_outs
  for delete using (organization_id = auth_org_id());

create policy "org_comm_delivery_log_select" on comm_delivery_log
  for select using (organization_id = auth_org_id());
create policy "org_comm_delivery_log_insert" on comm_delivery_log
  for insert with check (organization_id = auth_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS enabled (from migrations) but MISSING policies
-- ─────────────────────────────────────────────────────────────────────────────

-- breach_notifications (highly sensitive HIPAA compliance data)
create policy "org_breach_notifications_select" on breach_notifications
  for select using (organization_id = auth_org_id());
create policy "org_breach_notifications_insert" on breach_notifications
  for insert with check (organization_id = auth_org_id());
create policy "org_breach_notifications_update" on breach_notifications
  for update using (organization_id = auth_org_id());
create policy "org_breach_notifications_delete" on breach_notifications
  for delete using (organization_id = auth_org_id());

-- ebp_practices (org-scoped EBP program registry)
create policy "org_ebp_practices_select" on ebp_practices
  for select using (organization_id = auth_org_id());
create policy "org_ebp_practices_insert" on ebp_practices
  for insert with check (organization_id = auth_org_id());
create policy "org_ebp_practices_update" on ebp_practices
  for update using (organization_id = auth_org_id());
create policy "org_ebp_practices_delete" on ebp_practices
  for delete using (organization_id = auth_org_id());

-- ebp_fidelity_assessments (org-scoped fidelity data)
create policy "org_ebp_fidelity_select" on ebp_fidelity_assessments
  for select using (organization_id = auth_org_id());
create policy "org_ebp_fidelity_insert" on ebp_fidelity_assessments
  for insert with check (organization_id = auth_org_id());
create policy "org_ebp_fidelity_update" on ebp_fidelity_assessments
  for update using (organization_id = auth_org_id());
create policy "org_ebp_fidelity_delete" on ebp_fidelity_assessments
  for delete using (organization_id = auth_org_id());

-- skill_programs (PHI — contains client_id)
create policy "org_skill_programs_select" on skill_programs
  for select using (organization_id = auth_org_id());
create policy "org_skill_programs_insert" on skill_programs
  for insert with check (organization_id = auth_org_id());
create policy "org_skill_programs_update" on skill_programs
  for update using (organization_id = auth_org_id());
create policy "org_skill_programs_delete" on skill_programs
  for delete using (organization_id = auth_org_id());

-- skill_data_points (PHI — contains client_id)
create policy "org_skill_data_points_select" on skill_data_points
  for select using (organization_id = auth_org_id());
create policy "org_skill_data_points_insert" on skill_data_points
  for insert with check (organization_id = auth_org_id());
create policy "org_skill_data_points_update" on skill_data_points
  for update using (organization_id = auth_org_id());
create policy "org_skill_data_points_delete" on skill_data_points
  for delete using (organization_id = auth_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FIX broken policies that used `using (true)` (no actual access control)
-- ─────────────────────────────────────────────────────────────────────────────

-- locations: drop permissive policies, replace with org-scoped ones
drop policy if exists "org_locations_select" on locations;
drop policy if exists "org_locations_insert" on locations;
drop policy if exists "org_locations_update" on locations;

create policy "org_locations_select" on locations
  for select using (organization_id = auth_org_id());
create policy "org_locations_insert" on locations
  for insert with check (organization_id = auth_org_id());
create policy "org_locations_update" on locations
  for update using (organization_id = auth_org_id());
create policy "org_locations_delete" on locations
  for delete using (organization_id = auth_org_id());

-- program_assessment_requirements: drop permissive policies, replace with org-scoped ones
drop policy if exists "org_prog_assess_req_select" on program_assessment_requirements;
drop policy if exists "org_prog_assess_req_insert" on program_assessment_requirements;
drop policy if exists "org_prog_assess_req_update" on program_assessment_requirements;
drop policy if exists "org_prog_assess_req_delete" on program_assessment_requirements;

create policy "org_prog_assess_req_select" on program_assessment_requirements
  for select using (organization_id = auth_org_id());
create policy "org_prog_assess_req_insert" on program_assessment_requirements
  for insert with check (organization_id = auth_org_id());
create policy "org_prog_assess_req_update" on program_assessment_requirements
  for update using (organization_id = auth_org_id());
create policy "org_prog_assess_req_delete" on program_assessment_requirements
  for delete using (organization_id = auth_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Add missing DELETE policies to tables that lacked them
-- ─────────────────────────────────────────────────────────────────────────────

-- clients: add delete policy
create policy "org_clients_delete" on clients
  for delete using (organization_id = auth_org_id());

-- appointments: add delete policy
create policy "org_appointments_delete" on appointments
  for delete using (organization_id = auth_org_id());

-- encounters: add delete policy
create policy "org_encounters_delete" on encounters
  for delete using (organization_id = auth_org_id());

-- treatment_plans: add delete policy
create policy "org_treatment_plans_delete" on treatment_plans
  for delete using (organization_id = auth_org_id());

-- charges: add delete policy
create policy "org_charges_delete" on charges
  for delete using (organization_id = auth_org_id());

-- referrals: add delete policy
create policy "org_referrals_delete" on referrals
  for delete using (organization_id = auth_org_id());

-- screenings: add update + delete
create policy "org_screenings_update" on screenings
  for update using (organization_id = auth_org_id());
create policy "org_screenings_delete" on screenings
  for delete using (organization_id = auth_org_id());

-- documents: add update + delete
create policy "org_documents_update" on documents
  for update using (organization_id = auth_org_id());
create policy "org_documents_delete" on documents
  for delete using (organization_id = auth_org_id());

-- note_amendments: add delete
create policy "org_note_amendments_delete" on note_amendments
  for delete using (organization_id = auth_org_id());

-- consent_forms: add delete
create policy "org_consent_forms_delete" on consent_forms
  for delete using (organization_id = auth_org_id());

-- client_transportation: add explicit insert/update/delete policies using auth_org_id()
-- (the existing "org isolation" policy is an ALL policy using auth.uid() — keep it,
--  but add auth_org_id()-based variants for consistency when Clerk JWT is present)
create policy "org_client_transportation_select" on client_transportation
  for select using (organization_id = auth_org_id());
create policy "org_client_transportation_insert" on client_transportation
  for insert with check (organization_id = auth_org_id());
create policy "org_client_transportation_update" on client_transportation
  for update using (organization_id = auth_org_id());
create policy "org_client_transportation_delete" on client_transportation
  for delete using (organization_id = auth_org_id());
