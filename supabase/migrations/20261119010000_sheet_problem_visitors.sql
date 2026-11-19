-- Remember completed imports independently of the editable/deletable visitor row.
create table public.problem_visitor_sheet_imports (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  primary key (user_id, source_key)
);
alter table public.problem_visitor_sheet_imports enable row level security;
revoke all on public.problem_visitor_sheet_imports from public, anon, authenticated;
grant select, insert on public.problem_visitor_sheet_imports to service_role;
grant select, insert on public.problem_visitors to service_role;

create function public.import_sheet_problem_visitors(account_id uuid, entries jsonb)
returns void language sql security invoker set search_path = '' as $$
  with incoming as (
    select distinct on (v.source_key) v.*
    from jsonb_to_recordset(entries) as v(source_key text, full_name text, father_name text, issue text)
    order by v.source_key
  ), fresh as (
    insert into public.problem_visitor_sheet_imports(user_id,source_key)
    select account_id, source_key from incoming order by source_key
    on conflict do nothing returning source_key
  )
  insert into public.problem_visitors(user_id,full_name,father_name,issue)
  select distinct account_id,i.full_name,i.father_name,i.issue
  from fresh join incoming i using (source_key)
  where not exists (select 1 from public.problem_visitors p where p.user_id=account_id
    and p.full_name=i.full_name and p.father_name=i.father_name and p.issue=i.issue);
$$;
revoke all on function public.import_sheet_problem_visitors(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.import_sheet_problem_visitors(uuid,jsonb) to service_role;

create function public.import_sheet_visitors_for_managers(entries jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare account uuid;
begin
  for account in select user_id from public.dashboard_user_permissions
    where active and (role='super_admin' or (role='manager' and (permissions->'problem-visitors') ? 'view'))
    order by user_id
  loop
    perform public.import_sheet_problem_visitors(account, entries);
  end loop;
end $$;
revoke all on function public.import_sheet_visitors_for_managers(jsonb) from public,anon,authenticated;
grant execute on function public.import_sheet_visitors_for_managers(jsonb) to service_role;
