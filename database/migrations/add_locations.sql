-- Multi-location / multi-site support
-- Locations: physical sites/offices for an organization

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  code text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  phone text,
  fax text,
  npi text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_locations_org on locations(organization_id) where is_active = true;

-- Add location_id to programs table
alter table programs add column if not exists location_id uuid references locations(id) on delete set null;
create index if not exists idx_programs_location on programs(location_id);

-- Add location_id to appointments for scheduling at a specific site
alter table appointments add column if not exists location_id uuid references locations(id) on delete set null;

-- Row-level security
alter table locations enable row level security;

create policy "org_locations_select" on locations
  for select using (true);
create policy "org_locations_insert" on locations
  for insert with check (true);
create policy "org_locations_update" on locations
  for update using (true);
