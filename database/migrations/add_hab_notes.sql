-- ─────────────────────────────────────────────────────────────────────────────
-- Habilitation Notes — Structured documentation for hab services
-- Covers in-home hab, community hab, day hab, supported employment, etc.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists hab_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,

  -- Service info
  service_date date not null,
  start_time time,
  end_time time,
  duration_minutes integer,
  service_type text not null default 'in_home_hab' check (service_type in (
    'in_home_hab',
    'community_hab',
    'day_hab',
    'supported_employment',
    'supported_living',
    'respite',
    'prevocational',
    'other'
  )),
  location text,
  setting_details text,

  -- Staff
  staff_name text not null,
  staff_credentials text,
  staff_clerk_id text,

  -- ISP linkage
  isp_id uuid references individual_support_plans(id) on delete set null,
  goals_addressed text[],                    -- ISP goal text or area labels

  -- Skill areas targeted (multi-select)
  skill_areas text[],

  -- Prompt levels used in session
  prompt_levels_used text[],

  -- Client participation
  engagement_level text check (engagement_level in (
    'fully_engaged', 'partially_engaged', 'minimal_engagement', 'refused'
  )),
  attendance text not null default 'attended' check (attendance in (
    'attended', 'no_show', 'cancelled', 'cancelled_by_staff', 'cancelled_by_client'
  )),

  -- Documentation narrative
  service_summary text not null,
  skills_practiced text,
  client_response text,
  progress_toward_goals text,
  barriers text,
  strategies_used text,
  next_steps text,

  -- Safety
  safety_concern boolean not null default false,
  safety_notes text,

  -- Follow-up
  follow_up_date date,
  follow_up_notes text,

  -- Billing
  billing_code text,
  billing_modifier text,
  units integer not null default 1,
  is_billable boolean not null default true,

  -- Review
  supervisor_reviewed boolean not null default false,
  supervisor_name text,
  supervisor_reviewed_at timestamptz,

  -- Meta
  notes text,
  created_by_clerk_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hab_notes_org on hab_notes(organization_id, service_date desc);
create index if not exists idx_hab_notes_client on hab_notes(client_id, service_date desc);
create index if not exists idx_hab_notes_date on hab_notes(organization_id, service_date);

-- RLS
alter table hab_notes enable row level security;

create policy "org_isolation_hab_notes" on hab_notes
  using (organization_id = (
    select organization_id from user_profiles
    where clerk_user_id = requesting_user_id()
  ));
