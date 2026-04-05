-- ─────────────────────────────────────────────────────────────────────────────
-- ABA Behavior Tracking — Applied Behavior Analysis data collection
-- Tracks target behaviors (reduction) and collects ABC (Antecedent-Behavior-
-- Consequence) data, supporting behavior intervention plans.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists behavior_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,

  -- Behavior definition
  behavior_name text not null,
  operational_definition text,          -- precise, observable, measurable definition
  behavior_type text not null default 'target' check (behavior_type in (
    'target',       -- behavior to reduce (challenging/interfering behavior)
    'replacement'   -- replacement/alternative behavior to increase
  )),

  -- Function of behavior (from FBA)
  behavior_function text check (behavior_function in (
    'attention',    -- maintained by social attention
    'escape',       -- escape/avoidance of demands or aversives
    'tangible',     -- access to tangible items or activities
    'sensory',      -- automatic/sensory reinforcement
    'unknown',
    'multiple'
  )),

  -- Measurement
  measurement_type text not null default 'frequency' check (measurement_type in (
    'frequency',       -- count occurrences per session/observation period
    'rate',            -- occurrences per unit time (per minute/hour)
    'duration',        -- total time behavior occurs (seconds)
    'interval',        -- partial or whole interval recording
    'abc_only'         -- narrative ABC recording without quantitative measurement
  )),
  interval_minutes integer,             -- observation period for rate/interval (e.g. 30 min)

  -- Targets
  baseline_value numeric,               -- baseline rate or frequency
  reduction_target_pct integer,         -- % reduction goal (e.g. 80 = 80% reduction from baseline)

  -- Intervention
  intervention_strategy text,           -- description of intervention approach (e.g. DRA, FCT, extinction)
  preventive_strategies text,           -- antecedent modifications / setting event manipulations
  consequence_strategies text,          -- how staff should respond when behavior occurs

  -- ISP linkage
  isp_id uuid references individual_support_plans(id) on delete set null,
  isp_goal_id text,

  -- Status
  status text not null default 'active' check (status in (
    'active', 'reduced', 'eliminated', 'on_hold', 'discontinued'
  )),
  eliminated_date date,

  -- Meta
  created_by_clerk_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_behavior_programs_org on behavior_programs(organization_id);
create index if not exists idx_behavior_programs_client on behavior_programs(client_id, status);

alter table behavior_programs enable row level security;

create policy "org_behavior_programs_select" on behavior_programs
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_behavior_programs_insert" on behavior_programs
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_behavior_programs_update" on behavior_programs
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_behavior_programs_delete" on behavior_programs
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));

-- ─────────────────────────────────────────────────────────────────────────────
-- Behavior Incidents — individual ABC data recordings
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists behavior_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  behavior_program_id uuid not null references behavior_programs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,

  -- When / where
  incident_date date not null,
  incident_time time,
  setting text,                          -- where the behavior occurred (classroom, home, community, etc.)

  -- Measurement
  duration_seconds integer,             -- duration of the behavior episode
  frequency_count integer default 1,    -- occurrences in this entry (usually 1 for individual incidents)
  severity text check (severity in ('mild', 'moderate', 'severe')),

  -- ABC data (Antecedent-Behavior-Consequence)
  antecedent text,                       -- what happened immediately before (trigger/context)
  behavior_description text,            -- observable description of what the behavior looked like
  consequence text,                     -- staff response / what happened after
  perceived_function text check (perceived_function in (
    'attention', 'escape', 'tangible', 'sensory', 'unknown'
  )),

  -- Staff
  staff_name text not null,
  staff_clerk_id text,

  -- Notes
  notes text,

  -- Meta
  created_at timestamptz not null default now()
);

create index if not exists idx_behavior_incidents_program on behavior_incidents(behavior_program_id, incident_date desc);
create index if not exists idx_behavior_incidents_client on behavior_incidents(client_id, incident_date desc);
create index if not exists idx_behavior_incidents_org on behavior_incidents(organization_id, incident_date desc);

alter table behavior_incidents enable row level security;

create policy "org_behavior_incidents_select" on behavior_incidents
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_behavior_incidents_insert" on behavior_incidents
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_behavior_incidents_update" on behavior_incidents
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
create policy "org_behavior_incidents_delete" on behavior_incidents
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = (current_setting('request.jwt.claims', true)::jsonb->>'sub') limit 1));
