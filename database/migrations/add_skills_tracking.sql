-- ─────────────────────────────────────────────────────────────────────────────
-- Skills Tracking — Skill acquisition programs and data points for DD clients
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists skill_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,

  -- Skill definition
  skill_name text not null,
  description text,
  category text not null default 'daily_living' check (category in (
    'daily_living', 'communication', 'social', 'academic',
    'vocational', 'self_care', 'motor', 'safety', 'other'
  )),

  -- ISP linkage (optional)
  isp_id uuid references individual_support_plans(id) on delete set null,
  isp_goal_id text,                         -- goal ID within ISP goals JSONB

  -- Measurement
  measurement_type text not null default 'percent_correct' check (measurement_type in (
    'percent_correct', 'frequency', 'duration', 'task_analysis'
  )),
  prompt_levels text[] default ARRAY['Independent','Verbal Prompt','Gestural Prompt','Physical Prompt','Full Physical Prompt'],

  -- Targets
  baseline_value numeric,                   -- starting performance level
  target_value numeric,                     -- goal performance (e.g. 80 for 80%)
  target_trials integer default 10,         -- number of trials per session
  mastery_criteria text,                    -- text description of mastery criteria

  -- Status
  status text not null default 'active' check (status in (
    'active', 'mastered', 'on_hold', 'discontinued'
  )),
  mastered_date date,

  -- Meta
  created_by_clerk_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_skill_programs_org on skill_programs(organization_id);
create index if not exists idx_skill_programs_client on skill_programs(client_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Skill data points — individual session recordings
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists skill_data_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  skill_program_id uuid not null references skill_programs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,

  -- Session info
  recorded_date date not null,
  staff_name text not null,
  staff_clerk_id text,

  -- Percent correct data
  trials_total integer,
  trials_correct integer,

  -- Alternate measurement types
  prompt_level text,                        -- prompt level used (if applicable)
  duration_seconds integer,                 -- for duration-based measurement
  frequency_count integer,                  -- for frequency-based measurement

  -- Notes
  session_notes text,

  -- Meta
  created_at timestamptz not null default now()
);

create index if not exists idx_skill_data_skill on skill_data_points(skill_program_id, recorded_date desc);
create index if not exists idx_skill_data_client on skill_data_points(client_id, recorded_date desc);
create index if not exists idx_skill_data_org on skill_data_points(organization_id, recorded_date desc);
