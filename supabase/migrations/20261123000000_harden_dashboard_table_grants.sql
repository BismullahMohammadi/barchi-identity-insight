-- Remove unnecessary API grants from private dashboard tables.
-- RLS does not filter TRUNCATE, so revoke it explicitly.
-- This migration changes privileges only; it does not delete or rewrite data.
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
