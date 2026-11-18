-- The scheduled workflow upserts one private result per Jalali reporting day.
create table if not exists public.daily_report_checks (
  report_date text primary key,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('complete', 'incomplete', 'nonwork', 'unavailable')),
  missing_count integer not null check (missing_count >= 0),
  registration jsonb,
  insijam jsonb,
  error_text text
);

alter table public.daily_report_checks enable row level security;
revoke all on public.daily_report_checks from public, anon, authenticated;
grant select, insert, update on public.daily_report_checks to service_role;
