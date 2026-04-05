-- ─────────────────────────────────────────────────────────────────────────────
-- Form Submissions — Track completion of custom and built-in form templates
-- Supports completion rate analytics and average score reporting by program
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,

  -- Template reference (supports built-in string IDs and custom UUID IDs)
  template_id text not null,
  template_name text not null,
  template_category text,

  -- Program linkage (optional — for "average scores by program")
  program_id uuid references programs(id) on delete set null,

  -- Completion tracking
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz default now(),
  completed_at timestamptz,

  -- Scoring (for scoreable forms — numeric fields summed)
  total_score int,
  max_score int,

  -- Raw answers
  answers jsonb default '{}',

  -- Metadata
  submitted_by_clerk_id text,
  submitted_by_name text,
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_form_submissions_org on form_submissions(organization_id, created_at desc);
create index if not exists idx_form_submissions_client on form_submissions(client_id);
create index if not exists idx_form_submissions_template on form_submissions(organization_id, template_id);
create index if not exists idx_form_submissions_program on form_submissions(program_id);
create index if not exists idx_form_submissions_status on form_submissions(organization_id, status);

alter table form_submissions enable row level security;

create policy "org_form_submissions_select" on form_submissions
  for select using (organization_id = current_setting('app.current_org_id', true)::uuid);
create policy "org_form_submissions_insert" on form_submissions
  for insert with check (organization_id = current_setting('app.current_org_id', true)::uuid);
create policy "org_form_submissions_update" on form_submissions
  for update using (organization_id = current_setting('app.current_org_id', true)::uuid);
create policy "org_form_submissions_delete" on form_submissions
  for delete using (organization_id = current_setting('app.current_org_id', true)::uuid);
