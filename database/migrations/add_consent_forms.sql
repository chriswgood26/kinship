-- Consent Forms Tracking
-- Tracks patient consent forms and signatures for compliance

create table if not exists consent_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  form_type text not null, -- general_consent, hipaa_notice, treatment_consent, medication_consent, telehealth_consent, photography_consent, research_consent, financial_agreement, other
  title text not null,
  status text not null default 'pending_signature' check (status in ('pending_signature', 'signed', 'declined', 'expired', 'revoked')),
  signed_at timestamptz,
  signed_by text, -- 'patient', 'guardian', 'authorized_rep'
  guardian_name text,
  signature_method text default 'written' check (signature_method in ('written', 'electronic', 'verbal_documented')),
  witnessed_by text,
  expiration_date date,
  notes text,
  created_by text, -- clerk_user_id
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_consent_forms_org on consent_forms(organization_id);
create index if not exists idx_consent_forms_client on consent_forms(client_id);
create index if not exists idx_consent_forms_status on consent_forms(status);
create index if not exists idx_consent_forms_type on consent_forms(form_type);

alter table consent_forms enable row level security;

create policy "org_consent_forms_select" on consent_forms
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_consent_forms_insert" on consent_forms
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_consent_forms_update" on consent_forms
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
