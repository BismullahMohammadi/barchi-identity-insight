-- Apply through Supabase migrations before enabling the user-management screen.
-- Access is default-deny; authenticated users cannot grant permissions to themselves.
create table if not exists public.dashboard_user_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'manager' check (role in ('super_admin','manager')),
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.dashboard_permission_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  target_user_id uuid not null references auth.users(id),
  action text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.dashboard_user_permissions enable row level security;
alter table public.dashboard_permission_audit enable row level security;

create or replace function public.dashboard_is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.dashboard_user_permissions p
  where p.user_id = (select auth.uid()) and p.role = 'super_admin' and p.active = true
) $$;
revoke all on function public.dashboard_is_super_admin() from public;
grant execute on function public.dashboard_is_super_admin() to authenticated;

drop policy if exists dashboard_permissions_read on public.dashboard_user_permissions;
create policy dashboard_permissions_read on public.dashboard_user_permissions
for select to authenticated using (user_id = (select auth.uid()) or (select public.dashboard_is_super_admin()));
drop policy if exists dashboard_permissions_admin_insert on public.dashboard_user_permissions;
create policy dashboard_permissions_admin_insert on public.dashboard_user_permissions
for insert to authenticated with check ((select public.dashboard_is_super_admin()) and role = 'manager');
drop policy if exists dashboard_permissions_admin_update on public.dashboard_user_permissions;
create policy dashboard_permissions_admin_update on public.dashboard_user_permissions
for update to authenticated using ((select public.dashboard_is_super_admin()) and role = 'manager')
with check ((select public.dashboard_is_super_admin()) and role = 'manager');
drop policy if exists dashboard_audit_read on public.dashboard_permission_audit;
create policy dashboard_audit_read on public.dashboard_permission_audit
for select to authenticated using ((select public.dashboard_is_super_admin()));
-- No client INSERT/UPDATE/DELETE policy for audit; only trusted database triggers can write.
create or replace function public.dashboard_audit_permission_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.dashboard_permission_audit(actor_id,target_user_id,action,changes)
 values ((select auth.uid()), new.user_id, tg_op,
   jsonb_build_object('email',new.email,'role',new.role,'active',new.active,'permissions',new.permissions));
 return new;
end $$;
drop trigger if exists dashboard_permission_audit_trigger on public.dashboard_user_permissions;
create trigger dashboard_permission_audit_trigger after insert or update on public.dashboard_user_permissions
for each row execute function public.dashboard_audit_permission_change();

-- Bootstrap only the pre-existing verified owner, never a new email registration.
-- Review owner address before applying in a different deployment.
insert into public.dashboard_user_permissions(user_id,email,display_name,role,active)
select id, lower(email), 'عمومي مدیر', 'super_admin', true from auth.users
where lower(email) = 'bismullahm@gmail.com'
on conflict (user_id) do nothing;
