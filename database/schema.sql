-- Kinship EHR — Core Schema
-- Run this in Supabase SQL editor

-- Organizations (agencies/practices using Kinship)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  npi text,
  tax_id text,
  phone text,
  email text,
  website text,
  address_line1 text,
  city text,
  state text,
  zip text,
  org_type text default 'behavioral_health', -- behavioral_health, dd, cmhc, substance_use, residential
  client_terminology text default 'client', -- client, patient, individual, recipient, resident
  is_active boolean default true,
  plan text default 'starter', -- starter, growth, enterprise
  requested_plan text, -- plan tier requested by org admin, pending superadmin approval
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add requested_plan column if not exists
-- alter table organizations add column if not exists requested_plan text;

-- User profiles
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  clerk_user_id text not null unique,
  email text,
  first_name text,
  last_name text,
  roles text[] default '{clinician}', -- admin, clinician, supervisor, billing, care_coordinator, receptionist
  title text,
  credentials text,
  npi text,
  is_provider boolean default false, -- marks user as a selectable provider in encounters, appointments, etc.
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clients (patients/individuals)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  mrn text,
  first_name text not null,
  last_name text not null,
  preferred_name text,
  middle_name text,
  date_of_birth date,
  gender text,
  pronouns text,
  ssn_last4 text,
  race text,
  ethnicity text,
  primary_language text default 'English',
  phone_primary text,
  phone_secondary text,
  email text,
  address_line1 text,
  city text,
  state text,
  zip text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  insurance_provider text,
  insurance_member_id text,
  insurance_group_number text,
  insurance_auth_number text,
  insurance_secondary_provider text,
  insurance_secondary_member_id text,
  status text default 'active', -- active, discharged, waitlist, transferred, deceased
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-generate MRN
create sequence if not exists mrn_seq start 10001;

create or replace function generate_mrn()
returns trigger as $$
begin
  if new.mrn is null then
    new.mrn := 'KIN-' || lpad(nextval('mrn_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_mrn before insert on clients
  for each row execute function generate_mrn();

-- Appointments
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade not null,
  appointment_date date not null,
  start_time time,
  end_time time,
  duration_minutes int default 60,
  appointment_type text,
  status text default 'scheduled',
  is_group boolean default false,
  group_name text,
  notes text,
  -- Telehealth fields
  is_telehealth boolean default false,
  telehealth_platform text,        -- 'zoom' | 'webex' | 'jitsi'
  meeting_url text,
  meeting_id text,
  meeting_password text,
  telehealth_started_at timestamptz,
  telehealth_ended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add telehealth columns to existing appointments table
alter table appointments add column if not exists is_telehealth boolean default false;
alter table appointments add column if not exists telehealth_platform text;
alter table appointments add column if not exists meeting_url text;
alter table appointments add column if not exists meeting_id text;
alter table appointments add column if not exists meeting_password text;
alter table appointments add column if not exists telehealth_started_at timestamptz;
alter table appointments add column if not exists telehealth_ended_at timestamptz;

-- Migration: Scheduling Phase 2 — recurring, provider-only, calendar sync
alter table appointments alter column client_id drop not null;
alter table appointments add column if not exists provider_id uuid references user_profiles(id) on delete set null;
alter table appointments add column if not exists is_provider_only boolean default false;
alter table appointments add column if not exists recurrence_rule text;         -- e.g. FREQ=WEEKLY;BYDAY=MO,WE
alter table appointments add column if not exists recurrence_end_date date;
alter table appointments add column if not exists parent_appointment_id uuid references appointments(id) on delete cascade;
alter table appointments add column if not exists is_recurring_instance boolean default false;
create index if not exists idx_appointments_provider on appointments(provider_id) where provider_id is not null;
create index if not exists idx_appointments_parent on appointments(parent_appointment_id) where parent_appointment_id is not null;

-- Encounters
create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade not null,
  encounter_date date not null,
  encounter_type text,
  status text default 'in_progress',
  chief_complaint text,
  start_time time,
  end_time time,
  duration_minutes int,
  duration_override boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clinical notes
create table if not exists clinical_notes (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid references encounters(id) on delete cascade not null,
  note_type text default 'progress_note',
  subjective text,
  objective text,
  assessment text,
  plan text,
  diagnosis_codes text[],
  is_signed boolean default false,
  signed_at timestamptz,
  signed_by_clerk_id text,
  is_late_note boolean default false,
  late_note_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add late note columns if not exists
-- alter table clinical_notes add column if not exists is_late_note boolean default false;
-- alter table clinical_notes add column if not exists late_note_reason text;

-- Note amendments / addenda (corrections to locked/signed notes)
-- The original note is never modified; amendments append to the audit trail.
create table if not exists note_amendments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  note_id uuid references clinical_notes(id) on delete cascade not null,
  amendment_type text not null check (amendment_type in ('amendment', 'addendum')),
  -- amendment = factual correction; addendum = additional information
  content text not null,
  author_clerk_id text not null,
  author_name text,
  created_at timestamptz default now()
);

create index if not exists idx_note_amendments_note_id on note_amendments(note_id);
create index if not exists idx_note_amendments_org on note_amendments(organization_id);

-- Org-configurable encounter / appointment type definitions
create table if not exists encounter_appointment_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  category text not null check (category in ('appointment_client', 'appointment_provider', 'encounter')),
  name text not null,
  color text,
  default_duration_minutes int,
  is_telehealth boolean default false,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_enc_appt_types_org on encounter_appointment_types(organization_id);
create index if not exists idx_enc_appt_types_category on encounter_appointment_types(organization_id, category) where is_active = true;

-- Treatment plans
create table if not exists treatment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade not null,
  plan_start_date date,
  next_review_date date,
  presenting_problem text,
  strengths text,
  barriers text,
  diagnosis_codes text[],
  level_of_care text,
  goals jsonb default '[]',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Charges
create table if not exists charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade not null,
  encounter_id uuid references encounters(id),
  service_date date not null,
  cpt_code text not null,
  cpt_description text,
  icd10_codes text[],
  units int default 1,
  charge_amount decimal(10,2),
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

-- ICD-10 codes
create table if not exists icd10_codes (
  code text primary key,
  description text not null,
  category text,
  billable boolean default true
);

-- Referrals
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id),
  referral_type text not null default 'outgoing',
  status text default 'pending',
  priority text default 'routine',
  referred_by text,
  referred_by_email text,
  referred_to text,
  referred_to_email text,
  referred_to_org text,
  reason text,
  notes text,
  referral_date date,
  due_date date,
  applicant_email text,
  incident_category text default 'client',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add email columns if migrating existing DB
alter table referrals add column if not exists referred_by_email text;
alter table referrals add column if not exists referred_to_email text;
alter table referrals add column if not exists applicant_email text;

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade,
  referral_id uuid references referrals(id) on delete cascade,
  user_profile_id uuid references user_profiles(id) on delete cascade,
  uploaded_by text not null,
  file_name text not null,
  file_size int,
  file_type text,
  storage_path text not null,
  thumbnail_path text,
  category text default 'general',
  notes text,
  ocr_data jsonb,
  created_at timestamptz default now()
);

-- Add missing columns to existing documents tables (for migrations)
alter table documents add column if not exists referral_id uuid references referrals(id) on delete cascade;
alter table documents add column if not exists user_profile_id uuid references user_profiles(id) on delete cascade;
alter table documents add column if not exists thumbnail_path text;
alter table documents add column if not exists ocr_data jsonb;

-- Waitlist (for landing page signups)
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  agency_name text,
  agency_type text,
  agency_size text,
  message text,
  created_at timestamptz default now()
);

-- Verify
select 'Schema created successfully' as status,
  count(*) as table_count
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE';

-- Screenings (PHQ-9, GAD-7, etc.)
create table if not exists screenings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade not null,
  tool text not null, -- phq9, gad7
  answers jsonb default '{}',
  total_score int,
  severity_label text,
  administered_by text,
  administered_by_clerk_id text,
  administered_at timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Feedback
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  submitted_by_clerk_id text,
  submitted_by_name text,
  submitted_by_email text,
  type text not null default 'other', -- bug, feature, other
  problem text,
  impact text,
  tried text,
  ideal text,
  status text default 'new', -- new, reviewed, planned, shipped, closed
  admin_notes text,
  created_at timestamptz default now()
);

-- Safety Plans (CCBHC-required, builds on C-SSRS)
create table if not exists safety_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  cssrs_screening_id uuid references screenings(id) on delete set null,
  risk_level text,                           -- Low Risk, Moderate Risk, High Risk, Imminent Risk
  warning_signs text[] default '{}',         -- personal warning signs
  internal_coping_strategies text[] default '{}',
  social_contacts jsonb default '[]',        -- [{name, phone, relationship}]
  support_contacts jsonb default '[]',       -- [{name, phone, relationship}]
  professional_contacts jsonb default '[]',  -- [{name, phone, agency}]
  crisis_line_included boolean default true,
  means_restriction_discussed boolean default false,
  means_restriction_notes text,
  reasons_for_living text,
  client_agreement boolean default false,
  client_signature_date date,
  clinician_name text,
  clinician_credentials text,
  clinician_signature_date date,
  follow_up_date date,
  notes text,
  status text default 'active',              -- active, revised, superseded
  created_by_clerk_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add addons column to organizations
alter table organizations add column if not exists addons text[] default '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- Clearinghouse Integration (Office Ally)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add billing ERA columns to charges (for auto-payment posting)
alter table charges add column if not exists paid_amount decimal(10,2);
alter table charges add column if not exists era_remittance_id uuid;
alter table charges add column if not exists posted_at timestamptz;

-- HCBS/DD waiver unit-based billing columns
alter table charges add column if not exists unit_rate decimal(10,2);
alter table charges add column if not exists modifier text; -- e.g. HQ, HN, HO, HP, TF, U1-U8

-- Claim submissions to clearinghouse (837P/I)
create table if not exists clearinghouse_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  clearinghouse text not null default 'office_ally',
  submission_date timestamptz default now(),
  charge_ids text[] not null default '{}',
  status text default 'submitted',        -- submitted, acknowledged, rejected, failed
  submission_id text,                      -- Office Ally batch/confirmation ID
  control_number text,                     -- ISA13 interchange control number
  edi_content text,                        -- raw 837 content sent
  error_message text,
  -- 999 acknowledgment fields
  ack_status text,                         -- accepted, rejected
  ack_date date,
  ack_errors text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_clearinghouse_submissions_org
  on clearinghouse_submissions(organization_id, submission_date desc);

create index if not exists idx_clearinghouse_submissions_control
  on clearinghouse_submissions(control_number)
  where control_number is not null;

-- ERA / 835 remittance advices
create table if not exists era_remittances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  clearinghouse text not null default 'office_ally',
  payment_date date,
  payer_name text,
  payee_npi text,
  check_number text,
  payment_method text,                     -- ACH/EFT, Check, etc.
  total_payment_amount decimal(12,2) default 0,
  claims_count int default 0,
  raw_content text,                        -- raw 835 EDI stored for audit
  auto_posted boolean default false,
  posted_at timestamptz,
  post_errors text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_era_remittances_org
  on era_remittances(organization_id, payment_date desc);

-- Individual ERA payment line items (per CPT/service line)
create table if not exists era_payment_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  era_remittance_id uuid references era_remittances(id) on delete cascade not null,
  charge_id uuid references charges(id) on delete set null,
  payer_claim_number text,
  claim_status_code text,
  claim_status_label text,
  patient_name text,
  patient_member_id text,
  cpt_code text,
  charged_amount decimal(10,2),
  paid_amount decimal(10,2),
  patient_responsibility decimal(10,2),
  adjustments jsonb default '[]',          -- array of {groupCode, reasonCode, amount}
  posted boolean default false,
  posted_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_era_payment_lines_remittance
  on era_payment_lines(era_remittance_id);

create index if not exists idx_era_payment_lines_charge
  on era_payment_lines(charge_id)
  where charge_id is not null;

-- Appointment reminder log (tracks which reminders have been sent to prevent duplicates)
create table if not exists appointment_reminder_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete cascade not null,
  reminder_type text not null, -- confirmation, reminder_24h, reminder_1h, no_show_followup
  channel text not null,       -- email, sms
  recipient text,              -- email address or phone number
  sent_at timestamptz default now()
);

create index if not exists idx_reminder_log_appointment_id
  on appointment_reminder_log(appointment_id);

-- Portal users (patients / authorized representatives with portal access)
create table if not exists portal_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  clerk_user_id text unique,          -- Clerk user linked to this portal account
  email text not null,
  first_name text,
  last_name text,
  relationship text default 'self',   -- self, parent, guardian, caregiver, authorized_rep
  is_active boolean default true,
  access_settings jsonb default '{"messages": true, "appointments": true, "documents": false}',
  invite_token text unique,           -- secure random token for invitation link
  invite_expires_at timestamptz,      -- token expiry (72 hours from creation)
  invite_accepted_at timestamptz,     -- when the invitation was accepted (account linked)
  invited_by text,                    -- clerk_user_id of staff who sent the invite
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration: add invite columns if upgrading from earlier schema
alter table portal_users add column if not exists invite_token text unique;
alter table portal_users add column if not exists invite_expires_at timestamptz;
alter table portal_users add column if not exists invite_accepted_at timestamptz;
alter table portal_users add column if not exists invited_by text;

create index if not exists idx_portal_users_org on portal_users(organization_id);
create index if not exists idx_portal_users_client on portal_users(client_id);
create index if not exists idx_portal_users_clerk on portal_users(clerk_user_id) where clerk_user_id is not null;

-- Portal messages (bidirectional secure messaging between patients and staff)
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  portal_user_id uuid references portal_users(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')), -- inbound = patient→staff, outbound = staff→patient
  subject text,
  body text not null,
  sender_clerk_id text,               -- Clerk user ID of sender (staff or portal user)
  sender_name text,                   -- Display name of sender
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_portal_messages_org on portal_messages(organization_id);
create index if not exists idx_portal_messages_client on portal_messages(client_id, created_at desc);

create index if not exists idx_reminder_log_appointment
  on appointment_reminder_log(appointment_id, reminder_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- HIPAA PHI Audit Log
-- Required by 45 CFR §164.312(b): Audit controls for PHI access
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists phi_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  user_clerk_id text not null,              -- Clerk ID of the staff member who acted
  user_name text,                           -- Display name at time of action
  action text not null,                     -- view, create, update, delete, export, download, print
  resource_type text not null,              -- client, vitals, screening, clinical_note, encounter, etc.
  resource_id text,                         -- UUID of the record accessed (if applicable)
  client_id uuid references clients(id) on delete set null, -- patient whose data was accessed
  description text,                         -- human-readable summary
  ip_address text,                          -- requester IP
  user_agent text,                          -- browser / client string
  created_at timestamptz default now() not null
);

-- Optimized for HIPAA audit queries: by org+time, by user, by client
create index if not exists idx_phi_audit_logs_org_time
  on phi_audit_logs(organization_id, created_at desc);

create index if not exists idx_phi_audit_logs_user
  on phi_audit_logs(user_clerk_id, created_at desc);

create index if not exists idx_phi_audit_logs_client
  on phi_audit_logs(client_id, created_at desc)
  where client_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — Multi-tenant PHI isolation
-- Scopes all PHI table access to the authenticated user's organization.
-- The app uses the service role key (bypasses RLS), but these policies
-- enforce isolation for any anon/user-key queries and add defense-in-depth.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all PHI tables
alter table clients enable row level security;
alter table appointments enable row level security;
alter table encounters enable row level security;
alter table clinical_notes enable row level security;
alter table note_amendments enable row level security;
alter table treatment_plans enable row level security;
alter table charges enable row level security;
alter table screenings enable row level security;
alter table safety_plans enable row level security;
alter table documents enable row level security;
alter table referrals enable row level security;
alter table clearinghouse_submissions enable row level security;
alter table era_remittances enable row level security;
alter table era_payment_lines enable row level security;
alter table portal_users enable row level security;
alter table portal_messages enable row level security;
alter table phi_audit_logs enable row level security;
alter table user_profiles enable row level security;

-- Helper function: returns the organization_id for the authenticated Clerk user
-- Stored in user_profiles keyed by clerk_user_id JWT claim
create or replace function auth_org_id() returns uuid
  language sql stable security definer
as $$
  select organization_id
  from user_profiles
  where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub')
  limit 1;
$$;

-- clients: users can only see/modify clients in their org
create policy "org_clients_select" on clients
  for select using (organization_id = auth_org_id());
create policy "org_clients_insert" on clients
  for insert with check (organization_id = auth_org_id());
create policy "org_clients_update" on clients
  for update using (organization_id = auth_org_id());

-- appointments
create policy "org_appointments_select" on appointments
  for select using (organization_id = auth_org_id());
create policy "org_appointments_insert" on appointments
  for insert with check (organization_id = auth_org_id());
create policy "org_appointments_update" on appointments
  for update using (organization_id = auth_org_id());

-- encounters
create policy "org_encounters_select" on encounters
  for select using (organization_id = auth_org_id());
create policy "org_encounters_insert" on encounters
  for insert with check (organization_id = auth_org_id());
create policy "org_encounters_update" on encounters
  for update using (organization_id = auth_org_id());

-- clinical_notes: scoped through encounters
create policy "org_clinical_notes_select" on clinical_notes
  for select using (
    encounter_id in (select id from encounters where organization_id = auth_org_id())
  );
create policy "org_clinical_notes_insert" on clinical_notes
  for insert with check (
    encounter_id in (select id from encounters where organization_id = auth_org_id())
  );
create policy "org_clinical_notes_update" on clinical_notes
  for update using (
    encounter_id in (select id from encounters where organization_id = auth_org_id())
  );

-- note_amendments: scoped to organization
create policy "org_note_amendments_select" on note_amendments
  for select using (organization_id = auth_org_id());
create policy "org_note_amendments_insert" on note_amendments
  for insert with check (organization_id = auth_org_id());

-- treatment_plans
create policy "org_treatment_plans_select" on treatment_plans
  for select using (organization_id = auth_org_id());
create policy "org_treatment_plans_insert" on treatment_plans
  for insert with check (organization_id = auth_org_id());
create policy "org_treatment_plans_update" on treatment_plans
  for update using (organization_id = auth_org_id());

-- charges
create policy "org_charges_select" on charges
  for select using (organization_id = auth_org_id());
create policy "org_charges_insert" on charges
  for insert with check (organization_id = auth_org_id());
create policy "org_charges_update" on charges
  for update using (organization_id = auth_org_id());

-- screenings
create policy "org_screenings_select" on screenings
  for select using (organization_id = auth_org_id());
create policy "org_screenings_insert" on screenings
  for insert with check (organization_id = auth_org_id());

-- safety_plans
create policy "org_safety_plans_select" on safety_plans
  for select using (organization_id = auth_org_id());
create policy "org_safety_plans_insert" on safety_plans
  for insert with check (organization_id = auth_org_id());
create policy "org_safety_plans_update" on safety_plans
  for update using (organization_id = auth_org_id());

-- documents
create policy "org_documents_select" on documents
  for select using (organization_id = auth_org_id());
create policy "org_documents_insert" on documents
  for insert with check (organization_id = auth_org_id());

-- referrals
create policy "org_referrals_select" on referrals
  for select using (organization_id = auth_org_id());
create policy "org_referrals_insert" on referrals
  for insert with check (organization_id = auth_org_id());
create policy "org_referrals_update" on referrals
  for update using (organization_id = auth_org_id());

-- clearinghouse_submissions
create policy "org_clearinghouse_submissions_select" on clearinghouse_submissions
  for select using (organization_id = auth_org_id());
create policy "org_clearinghouse_submissions_insert" on clearinghouse_submissions
  for insert with check (organization_id = auth_org_id());
create policy "org_clearinghouse_submissions_update" on clearinghouse_submissions
  for update using (organization_id = auth_org_id());

-- era_remittances
create policy "org_era_remittances_select" on era_remittances
  for select using (organization_id = auth_org_id());
create policy "org_era_remittances_insert" on era_remittances
  for insert with check (organization_id = auth_org_id());

-- era_payment_lines
create policy "org_era_payment_lines_select" on era_payment_lines
  for select using (organization_id = auth_org_id());
create policy "org_era_payment_lines_insert" on era_payment_lines
  for insert with check (organization_id = auth_org_id());
create policy "org_era_payment_lines_update" on era_payment_lines
  for update using (organization_id = auth_org_id());

-- portal_users
create policy "org_portal_users_select" on portal_users
  for select using (organization_id = auth_org_id());
create policy "org_portal_users_insert" on portal_users
  for insert with check (organization_id = auth_org_id());
create policy "org_portal_users_update" on portal_users
  for update using (organization_id = auth_org_id());

-- portal_messages
create policy "org_portal_messages_select" on portal_messages
  for select using (organization_id = auth_org_id());
create policy "org_portal_messages_insert" on portal_messages
  for insert with check (organization_id = auth_org_id());

-- phi_audit_logs (read-only for users; only service role can insert)
create policy "org_phi_audit_logs_select" on phi_audit_logs
  for select using (organization_id = auth_org_id());

-- user_profiles: users can read profiles within their own org
create policy "org_user_profiles_select" on user_profiles
  for select using (organization_id = auth_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Sliding Fee Scale Phase 2
-- Program-area overrides, per-service overrides, grant-specific schedules,
-- payer exclusions, retroactive adjustment tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- Program-area overrides: custom tier sets per clinical program
create table if not exists sfs_program_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  program_area text not null,   -- mental_health, substance_use, dd, residential, primary_care, other
  label text not null,
  tiers jsonb not null default '[]',  -- array of SFSTier objects
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sfs_program_overrides_org
  on sfs_program_overrides(organization_id) where is_active = true;

-- Per-service overrides: CPT-code-level copay override (supersedes tier lookup)
create table if not exists sfs_service_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  cpt_code text not null,
  cpt_description text,
  override_type text not null check (override_type in ('flat', 'percent', 'waive', 'full_fee')),
  override_value decimal(10,2) default 0,   -- $ for flat, 0-100 for percent, ignored for waive/full_fee
  applies_to_fpl_max int,                   -- null = applies to all FPL%; set to limit to ≤N%
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sfs_service_overrides_org
  on sfs_service_overrides(organization_id, cpt_code) where is_active = true;

-- Grant-specific schedules: named SFS schedules tied to grant requirements
create table if not exists sfs_grant_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  grant_name text not null,
  grant_number text,
  funder text,
  tiers jsonb not null default '[]',            -- array of SFSTier objects
  fpl_ceiling int,                               -- only applies to clients at/below this FPL%
  effective_date date not null,
  expiration_date date,
  applies_to_program_areas text[] default '{}', -- empty = all programs
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sfs_grant_schedules_org
  on sfs_grant_schedules(organization_id, effective_date desc) where is_active = true;

-- Payer exclusions: SFS does not apply when client has this insurance payer
create table if not exists sfs_payer_exclusions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  payer_name text not null,
  payer_id text,           -- clearinghouse payer ID (optional)
  reason text,             -- commercial_insurance, medicaid, medicare, managed_care, other
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_sfs_payer_exclusions_org
  on sfs_payer_exclusions(organization_id) where is_active = true;

-- Retroactive adjustment log: tracks when prior charges were re-calculated after tier change
create table if not exists sfs_retroactive_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  income_assessment_id uuid,   -- references client_income_assessments.id
  old_fpl_percent int,
  new_fpl_percent int,
  charges_affected int default 0,
  total_adjustment_delta decimal(12,2) default 0,  -- negative = client owes less
  applied_by_clerk_id text,
  line_items jsonb default '[]',  -- array of {charge_id, old_owes, new_owes, delta}
  status text default 'applied',  -- applied, reversed
  created_at timestamptz default now()
);

create index if not exists idx_sfs_retroactive_adj_org
  on sfs_retroactive_adjustments(organization_id, created_at desc);
create index if not exists idx_sfs_retroactive_adj_client
  on sfs_retroactive_adjustments(client_id, created_at desc);

-- RLS for Phase 2 tables (admin-only access via service role in app, policies for defense-in-depth)
alter table sfs_program_overrides enable row level security;
alter table sfs_service_overrides enable row level security;
alter table sfs_grant_schedules enable row level security;
alter table sfs_payer_exclusions enable row level security;
alter table sfs_retroactive_adjustments enable row level security;

create policy "org_sfs_program_overrides_select" on sfs_program_overrides
  for select using (organization_id = auth_org_id());
create policy "org_sfs_program_overrides_insert" on sfs_program_overrides
  for insert with check (organization_id = auth_org_id());
create policy "org_sfs_program_overrides_update" on sfs_program_overrides
  for update using (organization_id = auth_org_id());

create policy "org_sfs_service_overrides_select" on sfs_service_overrides
  for select using (organization_id = auth_org_id());
create policy "org_sfs_service_overrides_insert" on sfs_service_overrides
  for insert with check (organization_id = auth_org_id());
create policy "org_sfs_service_overrides_update" on sfs_service_overrides
  for update using (organization_id = auth_org_id());

create policy "org_sfs_grant_schedules_select" on sfs_grant_schedules
  for select using (organization_id = auth_org_id());
create policy "org_sfs_grant_schedules_insert" on sfs_grant_schedules
  for insert with check (organization_id = auth_org_id());
create policy "org_sfs_grant_schedules_update" on sfs_grant_schedules
  for update using (organization_id = auth_org_id());

create policy "org_sfs_payer_exclusions_select" on sfs_payer_exclusions
  for select using (organization_id = auth_org_id());
create policy "org_sfs_payer_exclusions_insert" on sfs_payer_exclusions
  for insert with check (organization_id = auth_org_id());
create policy "org_sfs_payer_exclusions_update" on sfs_payer_exclusions
  for update using (organization_id = auth_org_id());

create policy "org_sfs_retroactive_adj_select" on sfs_retroactive_adjustments
  for select using (organization_id = auth_org_id());
create policy "org_sfs_retroactive_adj_insert" on sfs_retroactive_adjustments
  for insert with check (organization_id = auth_org_id());

-- ─── Patient Communications Automation Engine ─────────────────────────────────

-- Message templates (org-configurable with variable interpolation)
create table if not exists comm_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  channel text not null check (channel in ('email', 'sms', 'both')),
  subject text, -- email subject (may use {{vars}})
  body text not null, -- email HTML or SMS text (may use {{vars}})
  sms_body text, -- separate SMS body when channel = 'both'
  variables jsonb default '[]', -- declared vars e.g. ["client_first_name","appointment_date"]
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Automation rules (event → template → channel → recipient)
create table if not exists comm_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  event_trigger text not null, -- appointment_scheduled | appointment_reminder_24h | appointment_reminder_1h | appointment_cancelled | appointment_no_show | intake_completed | discharge_completed | treatment_plan_due | birthday
  template_id uuid references comm_templates(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'both')),
  offset_minutes int default 0, -- negative = before event, positive = after
  is_active boolean default true,
  created_by_clerk_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Per-client opt-outs per channel
create table if not exists comm_opt_outs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  channel text not null check (channel in ('email', 'sms', 'all')),
  reason text,
  opted_out_at timestamptz default now(),
  opted_back_in_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (organization_id, client_id, channel)
);

-- Delivery log (every automated send)
create table if not exists comm_delivery_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  rule_id uuid references comm_rules(id) on delete set null,
  template_id uuid references comm_templates(id) on delete set null,
  client_id uuid references clients(id) on delete cascade,
  event_trigger text not null,
  channel text not null,
  recipient text not null, -- email address or phone number
  subject text,
  body text,
  delivery_status text default 'pending' check (delivery_status in ('pending','sent','failed','opted_out','bounced')),
  delivery_error text,
  external_id text, -- Resend message ID or Twilio SID
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS: scope all comm tables to organization
alter table comm_templates enable row level security;
alter table comm_rules enable row level security;
alter table comm_opt_outs enable row level security;
alter table comm_delivery_log enable row level security;

-- Appointment Requests (patient-initiated via portal)
create table if not exists appointment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  portal_user_id uuid references portal_users(id) on delete set null,
  requested_date date,
  requested_time text,
  appointment_type text,
  notes text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'denied')),
  reviewed_by text,             -- clerk_user_id of staff who acted
  reviewed_at timestamptz,
  appointment_id uuid references appointments(id) on delete set null, -- linked appt once confirmed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_appt_requests_org on appointment_requests(organization_id);
create index if not exists idx_appt_requests_client on appointment_requests(client_id);
create index if not exists idx_appt_requests_status on appointment_requests(status);

alter table appointment_requests enable row level security;

create policy "org_appt_requests_select" on appointment_requests
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_appt_requests_insert" on appointment_requests
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_appt_requests_update" on appointment_requests
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));

-- Migration: provider flag on user_profiles
alter table user_profiles add column if not exists is_provider boolean default false;

-- Multi-role migration: convert single role text to roles array
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{clinician}';
UPDATE user_profiles SET roles = ARRAY[role] WHERE roles IS NULL OR roles = '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- CCBHC Prospective Payment System (PPS)
-- ─────────────────────────────────────────────────────────────────────────────

-- Per-org PPS rate configuration (one active record per org at a time)
create table if not exists ccbhc_pps_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  methodology text not null check (methodology in ('pps1_daily', 'pps2_monthly')),
  daily_rate decimal(10,2),          -- PPS-1: per-diem rate per qualifying client per day
  monthly_rate decimal(10,2),        -- PPS-2: per-member per month rate
  billing_code text not null default 'T1015',  -- procedure code on PPS claim (often T1015 or state-specific)
  billing_modifier text,             -- optional modifier (e.g. U1, HQ, state-specific)
  effective_date date not null default current_date,
  state_program_id text,             -- state-assigned CCBHC program identifier
  notes text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ccbhc_pps_settings_org on ccbhc_pps_settings(organization_id);

-- PPS claim records — one per client per qualifying day (PPS-1) or month (PPS-2)
create table if not exists ccbhc_pps_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  methodology text not null check (methodology in ('pps1_daily', 'pps2_monthly')),
  period_start date not null,        -- PPS-1: the qualifying service date; PPS-2: first day of month
  period_end date not null,          -- PPS-1: same as period_start; PPS-2: last day of month
  rate_applied decimal(10,2) not null,
  charge_amount decimal(10,2) not null,
  billing_code text not null default 'T1015',
  billing_modifier text,
  icd10_codes text[] default '{}',
  status text not null default 'draft' check (status in ('draft','pending','submitted','paid','denied','void')),
  charge_id uuid references charges(id) on delete set null,   -- linked standard charge if converted
  qualifying_encounter_ids text[] default '{}',               -- encounter IDs that triggered this PPS day
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ccbhc_pps_claims_org on ccbhc_pps_claims(organization_id, period_start desc);
create index if not exists idx_ccbhc_pps_claims_client on ccbhc_pps_claims(client_id);
create index if not exists idx_ccbhc_pps_claims_status on ccbhc_pps_claims(status);

-- Unique constraint: one non-void PPS claim per client per period per methodology
create unique index if not exists idx_ccbhc_pps_claims_unique
  on ccbhc_pps_claims(organization_id, client_id, period_start, period_end)
  where status != 'void';

-- ─────────────────────────────────────────────────────────────────────────────
-- CCBHC Peer Support Session Documentation
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists peer_support_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  session_date date not null default current_date,
  start_time time,
  end_time time,
  duration_minutes int,                -- computed or manually entered
  session_type text not null default 'individual' check (session_type in ('individual', 'group', 'phone', 'telehealth', 'text_outreach', 'community')),
  location text,                       -- office, home, community, phone, etc.
  specialist_name text not null,       -- peer support specialist full name
  specialist_clerk_id text,            -- clerk_user_id if staff member
  specialist_credentials text,         -- e.g. CPRS, CPS, PRSS
  -- Session content
  session_focus text[],                -- multi-select: wellness, employment, housing, recovery, family, etc.
  session_summary text,                -- narrative summary of the session
  lived_experience_shared boolean default false,  -- did specialist share their lived experience?
  lived_experience_notes text,         -- optional: how/why (kept general to protect privacy)
  -- Recovery-oriented outcomes
  engagement_level text check (engagement_level in ('fully_engaged', 'partially_engaged', 'minimal_engagement', 'refused')),
  wellness_plan_reviewed boolean default false,
  recovery_goals_addressed text,       -- narrative
  strengths_identified text,
  barriers_addressed text,
  -- Safety
  safety_check_completed boolean default false,
  crisis_indicated boolean default false,
  crisis_response_taken text,          -- what was done if crisis_indicated
  -- Next steps
  next_session_planned date,
  next_session_notes text,
  referrals_made text,                 -- any referrals or linkages to services
  -- Billing / compliance
  billing_code text default 'H0038',  -- H0038 = peer support services (CCBHC standard)
  billing_modifier text,
  units int default 1,                 -- typically 15-min units
  is_billable boolean default true,
  -- Review
  supervisor_reviewed boolean default false,
  supervisor_name text,
  supervisor_reviewed_at timestamptz,
  notes text,
  created_by_clerk_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_peer_support_org on peer_support_sessions(organization_id, session_date desc);
create index if not exists idx_peer_support_client on peer_support_sessions(client_id);
create index if not exists idx_peer_support_specialist on peer_support_sessions(specialist_clerk_id);

alter table peer_support_sessions enable row level security;

create policy "org_peer_support_select" on peer_support_sessions
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_peer_support_insert" on peer_support_sessions
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_peer_support_update" on peer_support_sessions
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_peer_support_delete" on peer_support_sessions
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));

-- ─────────────────────────────────────────────────────────────────────────────
-- HIPAA Privacy Notice Acknowledgments
-- ─────────────────────────────────────────────────────────────────────────────
-- HIPAA privacy notice acknowledgments are tracked using the existing
-- consent_forms table with form_type = 'hipaa_notice'.
-- The /dashboard/privacy-notices page provides a compliance-focused view
-- showing per-client acknowledgment status, annual renewal tracking, and
-- a list of patients who have never received or have an expired NPP.
--
-- The consent_forms table already supports all required fields:
--   - client_id, organization_id (multi-tenant scoping)
--   - status: signed | pending_signature | declined | expired | revoked
--   - signed_at, signed_by, guardian_name (who signed)
--   - signature_method: written | electronic | verbal_documented
--   - expiration_date (set to 1 year from signing for annual renewal tracking)
--   - witnessed_by, notes
--
-- No additional migration needed — uses existing consent_forms table.

-- ─────────────────────────────────────────────────────────────────────────────
-- Community Support Services
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists community_support_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references patients(id) on delete cascade,

  -- Activity info
  activity_date date not null,
  start_time time,
  end_time time,
  duration_minutes integer,
  activity_type text not null default 'case_management' check (activity_type in (
    'case_management', 'community_integration', 'natural_supports',
    'transportation', 'housing_support', 'employment_support',
    'benefits_assistance', 'food_access', 'social_skills',
    'independent_living', 'family_support', 'crisis_intervention', 'other'
  )),
  location text,                        -- office, community, home, phone, etc.
  setting text,                         -- where the activity took place

  -- Staff
  staff_name text not null,
  staff_clerk_id text,
  staff_credentials text,

  -- Documentation
  activity_summary text not null,
  goals_addressed text[],               -- array of goal areas addressed
  client_response text,                 -- how the client responded/engaged
  progress_notes text,                  -- progress toward goals
  barriers_identified text,
  action_steps text,                    -- next steps / follow-up actions
  resources_connected text,             -- community resources or services connected
  collateral_contacts text,             -- contacts made with family, providers, etc.

  -- Engagement
  engagement_level text check (engagement_level in ('fully_engaged', 'partially_engaged', 'minimal_engagement', 'refused')),
  attendance text check (attendance in ('attended', 'no_show', 'cancelled', 'rescheduled')),

  -- Safety
  safety_concern boolean not null default false,
  safety_notes text,

  -- Follow-up
  follow_up_date date,
  follow_up_notes text,

  -- Billing
  billing_code text,
  billing_modifier text,
  units integer default 1,
  is_billable boolean not null default true,

  -- Meta
  notes text,
  created_by_clerk_id text,
  supervisor_reviewed boolean not null default false,
  supervisor_name text,
  supervisor_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_support_org on community_support_activities(organization_id, activity_date desc);
create index if not exists idx_community_support_client on community_support_activities(client_id);
create index if not exists idx_community_support_staff on community_support_activities(staff_clerk_id);

alter table community_support_activities enable row level security;

create policy "org_community_support_select" on community_support_activities
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_community_support_insert" on community_support_activities
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_community_support_update" on community_support_activities
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_community_support_delete" on community_support_activities
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));

-- ─────────────────────────────────────────────────────────────────────────────
-- Day Program Attendance Tracking
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists day_program_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  client_id uuid not null references patients(id) on delete cascade,
  attendance_date date not null,

  -- Attendance status
  status text not null default 'present' check (status in (
    'present', 'absent', 'partial', 'excused', 'no_show'
  )),
  check_in_time time,
  check_out_time time,
  hours_attended numeric(4,2),

  -- Documentation
  reason_absent text,
  activity_notes text,
  behavior_notes text,
  goal_progress text[],

  -- Staff
  staff_name text,
  staff_clerk_id text,

  -- Billing
  billing_code text default 'H2014',
  billing_modifier text,
  units integer,
  is_billable boolean not null default true,

  -- Meta
  notes text,
  created_by_clerk_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(organization_id, program_id, client_id, attendance_date)
);

create index if not exists idx_day_program_attendance_org on day_program_attendance(organization_id, attendance_date desc);
create index if not exists idx_day_program_attendance_program on day_program_attendance(program_id, attendance_date desc);
create index if not exists idx_day_program_attendance_client on day_program_attendance(client_id);

alter table day_program_attendance enable row level security;

create policy "org_day_attendance_select" on day_program_attendance
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_day_attendance_insert" on day_program_attendance
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_day_attendance_update" on day_program_attendance
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_day_attendance_delete" on day_program_attendance
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
