-- Client transportation tracking for DD programs
create table if not exists client_transportation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  trip_date date not null,
  trip_purpose text not null default 'day_program',
  -- vehicle info
  vehicle_id text,
  vehicle_name text,
  driver_name text,
  -- times
  pickup_time time,
  dropoff_time time,
  -- locations
  pickup_address text,
  dropoff_address text,
  -- mileage
  odometer_start numeric(8,1),
  odometer_end numeric(8,1),
  mileage numeric(6,1),
  -- status
  status text not null default 'scheduled',
  -- escort
  escort_required boolean not null default false,
  escort_staff text,
  -- notes
  behavior_notes text,
  notes text,
  -- audit
  created_by_clerk_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists client_transportation_org_idx on client_transportation(organization_id);
create index if not exists client_transportation_client_idx on client_transportation(client_id);
create index if not exists client_transportation_date_idx on client_transportation(trip_date);
create index if not exists client_transportation_status_idx on client_transportation(status);

-- RLS
alter table client_transportation enable row level security;
create policy "org isolation" on client_transportation
  using (organization_id = (
    select organization_id from user_profiles where clerk_user_id = auth.uid()::text
  ));
