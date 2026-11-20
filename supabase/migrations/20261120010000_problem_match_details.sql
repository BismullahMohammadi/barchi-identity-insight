create table if not exists public.problem_match_details (
  visitor_id uuid not null references public.problem_visitors(id) on delete cascade,
  record_key text not null,
  detail jsonb not null,
  recorded_at timestamptz not null default now(),
  primary key (visitor_id, record_key)
);
alter table public.problem_match_details enable row level security;
revoke all on public.problem_match_details from public, anon, authenticated;
grant select, insert, update on public.problem_match_details to service_role;

create or replace function public.save_problem_match_details(account_id uuid, entries jsonb)
returns void language sql security invoker set search_path = '' as $$
  insert into public.problem_match_details(visitor_id, record_key, detail)
  select p.id, e.key, e.detail
  from jsonb_to_recordset(entries) as e(visitor_id uuid, key text, detail jsonb)
  join public.problem_visitors p on p.id=e.visitor_id
  where p.user_id=account_id and p.status='active'
  on conflict (visitor_id, record_key) do update set detail=excluded.detail
  where public.problem_match_details.detail is distinct from excluded.detail;
$$;
revoke all on function public.save_problem_match_details(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_problem_match_details(uuid,jsonb) to service_role;
