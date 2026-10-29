create table if not exists public.fuel_entries(
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
entry_date date not null default current_date,
kind text not null check(kind in ('opening','received','used')),
liters numeric(12,2) not null check(liters>0 and liters<=100000),
reference_no text,
supplier text,
generator_hours numeric(10,2) check(generator_hours>=0),
note text,
created_at timestamptz not null default now()
);
create index if not exists fuel_entries_owner_date on public.fuel_entries(user_id,entry_date desc,created_at desc);
alter table public.fuel_entries enable row level security;
revoke all on public.fuel_entries from anon;
grant select,insert on public.fuel_entries to authenticated;
drop policy if exists fuel_entries_owner_select on public.fuel_entries;
create policy fuel_entries_owner_select on public.fuel_entries for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists fuel_entries_owner_insert on public.fuel_entries;
create policy fuel_entries_owner_insert on public.fuel_entries for insert to authenticated with check(user_id=(select auth.uid()));
create or replace function public.add_fuel_entry(p_kind text,p_liters numeric,p_date date,p_reference text default null,p_supplier text default null,p_hours numeric default null,p_note text default null)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_balance numeric; 
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if p_kind not in ('opening','received','used') or p_liters<=0 or p_liters>100000 or p_liters is null then raise exception 'INVALID_FUEL'; end if;
 if p_date is null or p_date>current_date+interval '1 day' then raise exception 'INVALID_DATE'; end if;
 if p_hours<0 or p_hours>100000 then raise exception 'INVALID_HOURS'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text), 21647);
 select coalesce(sum(case when kind='used' then -liters else liters end),0) into v_balance from public.fuel_entries where user_id=auth.uid();
 if p_kind='used' and v_balance<p_liters then raise exception 'INSUFFICIENT_FUEL'; end if;
 insert into public.fuel_entries(user_id,entry_date,kind,liters,reference_no,supplier,generator_hours,note)
 values(auth.uid(),p_date,p_kind,p_liters,left(nullif(trim(p_reference),''),120),left(nullif(trim(p_supplier),''),180),p_hours,left(nullif(trim(p_note),''),2000)) returning id into v_id;
 return v_id;
end;$$;
revoke all on function public.add_fuel_entry(text,numeric,date,text,text,numeric,text) from public,anon;
grant execute on function public.add_fuel_entry(text,numeric,date,text,text,numeric,text) to authenticated;
