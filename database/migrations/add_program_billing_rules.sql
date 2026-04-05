-- Billing rules per program
-- Adds CPT code restrictions, SFS eligibility, and required auth type configuration to programs

alter table programs
  add column if not exists allowed_cpt_codes text[] default null,
  add column if not exists sfs_eligible boolean default true,
  add column if not exists required_auth_types text[] default '{}';

comment on column programs.allowed_cpt_codes is 'CPT codes allowed for this program (null = all codes allowed; non-null = restrict to listed codes)';
comment on column programs.sfs_eligible is 'Whether sliding fee scale discounts apply to services in this program';
comment on column programs.required_auth_types is 'Authorization types required before services can be billed: prior_auth, service_auth, loc_auth, csr';
