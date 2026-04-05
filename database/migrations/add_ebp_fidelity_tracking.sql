-- ─────────────────────────────────────────────────────────────────────────────
-- EBP Fidelity Tracking — Evidence-Based Practice implementation monitoring
-- ─────────────────────────────────────────────────────────────────────────────

-- ── EBP Program Registry ────────────────────────────────────────────────────
-- Tracks which evidence-based practices the org has adopted

create table if not exists ebp_practices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,

  -- Practice identity
  practice_name text not null,              -- e.g. "CBT", "DBT", "Motivational Interviewing"
  practice_category text not null default 'psychotherapy' check (practice_category in (
    'psychotherapy', 'substance_use', 'trauma', 'family', 'community', 'medication', 'other'
  )),
  evidence_level text not null default 'well_supported' check (evidence_level in (
    'well_supported', 'supported', 'promising', 'emerging'
  )),
  target_population text,                   -- e.g. "Adults with MDD", "Adolescents with trauma"
  description text,

  -- Implementation
  implementing_staff text[],               -- clerk user IDs or names of trained clinicians
  trained_staff_count integer default 0,
  training_completed_date date,
  go_live_date date,                       -- when org started using this EBP

  -- Fidelity scale used
  fidelity_tool text,                      -- e.g. "SAMHSA Fidelity Scale", "DBT Adherence Scale"
  fidelity_tool_max_score integer,         -- max possible score on the fidelity tool

  -- Status
  status text not null default 'active' check (status in (
    'planning', 'training', 'active', 'on_hold', 'discontinued'
  )),
  discontinued_reason text,

  -- Meta
  notes text,
  created_by text,                         -- clerk user ID
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ebp_practices_org on ebp_practices(organization_id, status);

-- ── EBP Fidelity Assessments ─────────────────────────────────────────────────
-- Periodic fidelity checks against an EBP

create table if not exists ebp_fidelity_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ebp_practice_id uuid not null references ebp_practices(id) on delete cascade,

  -- Assessment metadata
  assessment_date date not null,
  assessor_name text not null,             -- person conducting the fidelity review
  clinician_assessed text,                 -- clinician whose delivery is being assessed
  program_assessed text,                   -- program or unit being assessed (if org-level)
  assessment_type text not null default 'self_assessment' check (assessment_type in (
    'self_assessment', 'peer_review', 'supervisor_review', 'external_review', 'chart_audit'
  )),

  -- Domain scores (JSONB for flexibility — keys are dimension names, values 0–100)
  domain_scores jsonb default '{}',        -- e.g. {"training": 90, "supervision": 75, ...}

  -- Computed fidelity
  overall_score numeric,                   -- weighted or mean of domain scores (0–100)
  fidelity_level text check (fidelity_level in (
    'high', 'moderate', 'low', 'non_adherent'
  )),

  -- Checklist items
  checklist_items jsonb default '[]',      -- [{item, met: bool, notes}]
  items_met integer default 0,
  items_total integer default 0,

  -- Narrative
  strengths text,
  areas_for_improvement text,
  recommendations text,
  action_plan text,
  follow_up_date date,

  -- Status
  status text not null default 'draft' check (status in ('draft', 'completed')),
  completed_at timestamptz,

  -- Meta
  notes text,
  created_by text,                         -- clerk user ID
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ebp_fidelity_org on ebp_fidelity_assessments(organization_id, assessment_date desc);
create index if not exists idx_ebp_fidelity_practice on ebp_fidelity_assessments(ebp_practice_id, assessment_date desc);
