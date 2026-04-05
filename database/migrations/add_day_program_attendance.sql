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
