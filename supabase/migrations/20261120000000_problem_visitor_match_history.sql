alter table public.problem_visitors
  add column if not exists first_matched_at timestamptz;

grant update (first_matched_at) on public.problem_visitors to service_role;
