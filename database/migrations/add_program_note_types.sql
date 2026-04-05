-- Note type enablement per program
-- Adds configurable note type settings to programs (SOAP, DD Notes, Group, Case Mgmt)

alter table programs
  add column if not exists enabled_note_types text[] default '{soap,dd_notes,group,case_mgmt}';

comment on column programs.enabled_note_types is 'List of note types enabled for this program: soap, dd_notes, group, case_mgmt';
