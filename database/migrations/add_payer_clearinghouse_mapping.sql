-- Payer management + clearinghouse ID mapping
-- Adds an org-scoped payer list and clearinghouse-specific payer ID assignments

-- Master payer list per org
create table if not exists payers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  payer_type text default 'commercial', -- commercial, medicaid, medicare, tricare, other
  state text,                            -- state abbreviation or 'Multi' / 'Federal'
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_payers_org
  on payers(organization_id) where is_active = true;

-- Clearinghouse-specific payer IDs (many per payer)
create table if not exists payer_clearinghouse_ids (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  payer_id uuid references payers(id) on delete cascade not null,
  clearinghouse text not null,            -- office_ally, availity, change_healthcare, waystar
  clearinghouse_payer_id text not null,   -- the payer ID as used by this clearinghouse
  is_default boolean default false,       -- preferred clearinghouse for this payer
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(payer_id, clearinghouse)         -- one ID per payer per clearinghouse
);

create index if not exists idx_payer_clearinghouse_ids_payer
  on payer_clearinghouse_ids(payer_id);

create index if not exists idx_payer_clearinghouse_ids_org
  on payer_clearinghouse_ids(organization_id);

-- RLS
alter table payers enable row level security;
alter table payer_clearinghouse_ids enable row level security;

create policy "org_payers_select" on payers
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
create policy "org_payers_insert" on payers
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
create policy "org_payers_update" on payers
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
create policy "org_payers_delete" on payers
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));

create policy "org_payer_ch_ids_select" on payer_clearinghouse_ids
  for select using (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
create policy "org_payer_ch_ids_insert" on payer_clearinghouse_ids
  for insert with check (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
create policy "org_payer_ch_ids_update" on payer_clearinghouse_ids
  for update using (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
create policy "org_payer_ch_ids_delete" on payer_clearinghouse_ids
  for delete using (organization_id = (select organization_id from user_profiles where clerk_user_id = auth.uid()::text));
