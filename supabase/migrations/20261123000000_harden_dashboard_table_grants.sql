-- Harden private dashboard tables against broad default Supabase grants.
-- RLS does not filter TRUNCATE, so remove that privilege explicitly.
-- No rows, identities, or application data are modified by this migration.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'daily_report_checks',
    'dashboard_permission_audit',
    'dashboard_todos',
    'dashboard_user_permissions',
    'fuel_entries',
    'generator_diesel_deliveries',
    'generator_meter_readings',
    'problem_match_details',
    'problem_visitor_sheet_imports',
    'problem_visitors'
  ] loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;
    execute format('revoke all privileges on table public.%I from PUBLIC, anon', table_name);
    execute format('revoke truncate, trigger, references on table public.%I from authenticated', table_name);
  end loop;
end
$$;
