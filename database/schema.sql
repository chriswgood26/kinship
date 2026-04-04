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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User profiles
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  clerk_user_id text not null unique,
  email text,
  first_name text,
  last_name text,
  role text default 'clinician', -- admin, clinician, supervisor, billing, care_coordinator, receptionist, dsp
  title text,
  credentials text,
  npi text,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Encounters
create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade not null,
  encounter_date date not null,
  encounter_type text,
  status text default 'in_progress',
  chief_complaint text,
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
  referred_to text,
  referred_to_org text,
  reason text,
  notes text,
  referral_date date,
  due_date date,
  incident_category text default 'client',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  client_id uuid references clients(id) on delete cascade,
  uploaded_by text not null,
  file_name text not null,
  file_size int,
  file_type text,
  storage_path text not null,
  category text default 'general',
  notes text,
  created_at timestamptz default now()
);

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

-- Add addons column to organizations
alter table organizations add column if not exists addons text[] default '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- Clearinghouse Integration (Office Ally)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add billing ERA columns to charges (for auto-payment posting)
alter table charges add column if not exists paid_amount decimal(10,2);
alter table charges add column if not exists era_remittance_id uuid;
alter table charges add column if not exists posted_at timestamptz;

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

create index if not exists idx_reminder_log_appointment
  on appointment_reminder_log(appointment_id, reminder_type);
