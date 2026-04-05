-- Caseload / Panel Management Migration
-- Adds primary clinician assignment to clients table for caseload tracking

alter table clients add column if not exists primary_clinician_id uuid references user_profiles(id) on delete set null;
alter table clients add column if not exists primary_clinician_name text;

create index if not exists idx_clients_primary_clinician on clients(primary_clinician_id) where primary_clinician_id is not null;
