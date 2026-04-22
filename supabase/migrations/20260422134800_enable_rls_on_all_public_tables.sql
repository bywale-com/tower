-- Enable RLS on every table in the public schema.
-- This is dynamic so it covers the current full table set (28 tables)
-- and any future tables created before this migration is re-run in lower envs.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
    execute format('alter table %I.%I force row level security', r.schemaname, r.tablename);
  end loop;
end
$$;

-- Explicitly ensure anon/authenticated cannot query app data directly.
-- Server-side app access is provided by SUPABASE_SERVICE_ROLE_KEY only.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('revoke all on table %I.%I from anon', r.schemaname, r.tablename);
    execute format('revoke all on table %I.%I from authenticated', r.schemaname, r.tablename);
  end loop;
end
$$;
