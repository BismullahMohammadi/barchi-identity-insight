-- Keep existing ownership policies and also require the section's assigned action.
create or replace function public.dashboard_has_action(section_name text, action_name text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.dashboard_user_permissions p
    where p.user_id = (select auth.uid()) and p.active and
      (p.role = 'super_admin' or (p.role = 'manager'
        and jsonb_typeof(p.permissions -> section_name) = 'array'
        and (p.permissions -> section_name) ? 'view'
        and (p.permissions -> section_name) ? action_name))
  )
$$;
revoke all on function public.dashboard_has_action(text,text) from public;
grant execute on function public.dashboard_has_action(text,text) to authenticated;

do $$
declare
  entry record;
  policy_name text;
  predicate text;
begin
  for entry in
    select * from (values
      ('problem_visitors','problem-visitors'), ('dashboard_todos','dashboard'),
      ('fuel_entries','fuel-management'), ('generator_meter_readings','fuel-management'),
      ('generator_diesel_deliveries','fuel-management')
    ) tables(table_name, section_name)
    cross join (values ('select','view'), ('insert','create'), ('update','edit'), ('delete','delete')) operations(command_name, action_name)
  loop
    if to_regclass(format('public.%I', entry.table_name)) is null then continue; end if;
    policy_name := 'dashboard_section_' || entry.command_name;
    predicate := format('(select public.dashboard_has_action(%L,%L))',entry.section_name,entry.action_name);
    execute format('drop policy if exists %I on public.%I',policy_name,entry.table_name);
    execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
      policy_name,entry.table_name,entry.command_name,
      case when entry.command_name = 'insert' then 'with check (' || predicate || ')'
           else 'using (' || predicate || ')' end);
  end loop;
end $$;
