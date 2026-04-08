-- Enable RLS on every table in the public schema.
-- The app uses the SERVICE_ROLE key (supabaseAdmin) which bypasses RLS, so
-- this locks the public anon API without affecting normal app operation.
-- Most tables already have RLS via add_rls_enforcement.sql; this catches any
-- newer tables that were added after that migration without it.
-- Idempotent — re-running on an already-RLS-enabled table is a no-op.

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table %I.%I enable row level security;', r.schemaname, r.tablename);
  end loop;
end $$;

-- Verify: show any public tables WITHOUT RLS (should be empty after run)
select tablename from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;
