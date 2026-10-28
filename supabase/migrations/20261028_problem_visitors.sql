-- Apply in the connected Supabase SQL editor before merging this feature.
create table if not exists public.problem_visitors (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 full_name text not null check (char_length(full_name) between 2 and 180),
 father_name text not null check (char_length(father_name) between 2 and 180),
 issue text not null check (char_length(issue) between 3 and 2000),
 status text not null default 'active' check (status in ('active','resolved')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists problem_visitors_owner on public.problem_visitors(user_id, status);
alter table public.problem_visitors enable row level security;
revoke all on public.problem_visitors from anon;
grant select,insert,update,delete on public.problem_visitors to authenticated;
create policy "problem_visitors_select_owner" on public.problem_visitors for select to authenticated using (user_id = (select auth.uid()));
create policy "problem_visitors_insert_owner" on public.problem_visitors for insert to authenticated with check (user_id = (select auth.uid()));
create policy "problem_visitors_update_owner" on public.problem_visitors for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "problem_visitors_delete_owner" on public.problem_visitors for delete to authenticated using (user_id = (select auth.uid()));
