-- Assessment requirements per program
-- Adds configurable intake assessment requirements and re-assessment frequency to programs

-- Add assessment requirement columns to programs table
alter table programs
  add column if not exists required_assessments text[] default '{}',
  add column if not exists reassessment_frequency_days integer,
  add column if not exists intake_assessment_notes text;

-- Table for detailed per-program assessment requirement configurations
create table if not exists program_assessment_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  program_id uuid references programs(id) on delete cascade not null,
  assessment_type text not null,       -- e.g. 'BPS', 'CUMHA', 'IM+CANS', 'Psych Eval', 'PHQ-9', 'GAD-7', 'C-SSRS'
  is_required_at_intake boolean default true,
  reassessment_frequency_days integer, -- null = no re-assessment required
  reminder_days_before integer default 14, -- days before due date to show alert
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(program_id, assessment_type)
);

create index if not exists idx_prog_assess_req_org on program_assessment_requirements(organization_id);
create index if not exists idx_prog_assess_req_program on program_assessment_requirements(program_id);

alter table program_assessment_requirements enable row level security;

create policy "org_prog_assess_req_select" on program_assessment_requirements
  for select using (true);
create policy "org_prog_assess_req_insert" on program_assessment_requirements
  for insert with check (true);
create policy "org_prog_assess_req_update" on program_assessment_requirements
  for update using (true);
create policy "org_prog_assess_req_delete" on program_assessment_requirements
  for delete using (true);
