-- The application reads and writes only the current user's personal todo rows.
-- Add explicit ownership policies; the section/action migration adds a second,
-- restrictive layer that checks dashboard:view/create/edit/delete.
do $$
begin
  if to_regclass('public.dashboard_todos') is null then
    raise exception 'dashboard_todos must exist before applying its ownership policies';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dashboard_todos'
      and column_name = 'user_id'
  ) then
    raise exception 'dashboard_todos.user_id is required for row ownership';
  end if;
end
$$;

alter table public.dashboard_todos enable row level security;
revoke all on public.dashboard_todos from public, anon;
grant select, insert, update, delete on public.dashboard_todos to authenticated;

drop policy if exists dashboard_todos_owner_select on public.dashboard_todos;
create policy dashboard_todos_owner_select
  on public.dashboard_todos for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists dashboard_todos_owner_insert on public.dashboard_todos;
create policy dashboard_todos_owner_insert
  on public.dashboard_todos for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists dashboard_todos_owner_update on public.dashboard_todos;
create policy dashboard_todos_owner_update
  on public.dashboard_todos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists dashboard_todos_owner_delete on public.dashboard_todos;
create policy dashboard_todos_owner_delete
  on public.dashboard_todos for delete to authenticated
  using (user_id = (select auth.uid()));

-- A restrictive guard prevents any broader permissive policy from exposing
-- another user's rows, while preserving the section/action restrictions.
drop policy if exists dashboard_todos_owner_guard on public.dashboard_todos;
create policy dashboard_todos_owner_guard
  on public.dashboard_todos as restrictive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
