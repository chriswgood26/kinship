-- Add time tracking fields to encounters table
alter table encounters
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists duration_minutes int,
  add column if not exists duration_override boolean default false;
