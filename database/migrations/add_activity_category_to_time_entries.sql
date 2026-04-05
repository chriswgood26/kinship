-- Add activity_category to time_entries for grouped reporting
-- Categories: clinical, case_management, care_coordination, documentation, supervision, training, admin
alter table time_entries
  add column if not exists activity_category text
    check (activity_category in (
      'clinical', 'case_management', 'care_coordination',
      'documentation', 'supervision', 'training', 'admin', 'other'
    ));

-- Backfill from existing activity_type values
update time_entries set activity_category = case
  when activity_type in ('individual_therapy','group_therapy','psychiatric_eval','medication_management','crisis_intervention','telehealth','assessment')
    then 'clinical'
  when activity_type = 'case_management' then 'case_management'
  when activity_type in ('care_coordination','consultation') then 'care_coordination'
  when activity_type = 'documentation' then 'documentation'
  when activity_type = 'supervision' then 'supervision'
  when activity_type = 'training' then 'training'
  when activity_type in ('admin','travel') then 'admin'
  else 'other'
end
where activity_category is null;

create index if not exists idx_time_entries_category on time_entries(organization_id, activity_category);
