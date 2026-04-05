-- ─────────────────────────────────────────────────────────────────────────────
-- HIPAA Breach Notification Tracking
-- 45 CFR §§164.400–414 — Notification in Case of Breach of Unsecured PHI
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists breach_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,

  -- Discovery & breach timing
  discovered_date date not null,
  breach_date date,                         -- when the breach actually occurred (may differ from discovery)

  -- Breach classification
  breach_type text not null,                -- unauthorized_access, theft, loss, improper_disposal, hacking, ransomware, wrong_recipient, other
  breach_cause text,                        -- free-text description of root cause
  business_associate_involved boolean default false,
  business_associate_name text,

  -- PHI types involved (jsonb array of strings)
  -- e.g. ["name","address","dob","ssn","diagnosis","treatment","insurance"]
  phi_types jsonb default '[]'::jsonb,

  -- Scope
  individuals_affected integer,             -- estimated or confirmed count
  description text not null,               -- narrative description of the breach

  -- Risk assessment
  risk_level text default 'medium',        -- low, medium, high, critical
  risk_assessment_notes text,

  -- Notification deadlines (60 days from discovery per HIPAA rule)
  individual_notification_deadline date,   -- computed: discovered_date + 60 days
  hhs_notification_deadline date,          -- computed: discovered_date + 60 days

  -- Individual notification
  individual_notification_sent_at timestamptz,
  individual_notification_method text,     -- mail, email, substitute_notice, conspicuous_posting

  -- HHS notification (all breaches within 60 days; <500/yr submitted annually by Mar 1)
  hhs_notification_submitted_at timestamptz,
  hhs_submission_type text,               -- immediate (>=500), annual (<500)

  -- Media notification (required if >=500 individuals in a state/jurisdiction)
  media_notification_required boolean default false,
  media_notification_sent_at timestamptz,

  -- Internal handling
  legal_counsel_notified boolean default false,
  legal_counsel_notified_at timestamptz,
  remediation_actions text,               -- steps taken to mitigate and prevent recurrence

  -- Workflow
  status text default 'open',             -- open, under_review, notifications_sent, reported_to_hhs, closed
  reviewed_by text,
  reviewed_at timestamptz,

  created_by text,                        -- Clerk user ID
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_breach_notifications_org
  on breach_notifications(organization_id, discovered_date desc);

create index if not exists idx_breach_notifications_status
  on breach_notifications(organization_id, status);
