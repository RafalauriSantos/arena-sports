-- Paywall enforcement in public occupancy RPC
--
-- If tenant is not within access window, RPC returns empty (no schedule).

begin;

create or replace function public.fn_public_get_occupied_slots(
  p_subdomain text,
  p_date date
)
returns table (
  court_id uuid,
  slot_time time
)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select id as tenant_id
    from public.tenants
    where subdomain = p_subdomain
      and subdomain is not null
      and public.fn_tenant_has_access(id)
    limit 1
  ),
  booking_occ as (
    select
      b.court_id,
      (b.start_time at time zone 'America/Sao_Paulo')::time as slot_time
    from public.bookings b
    join t on t.tenant_id = b.tenant_id
    where (b.start_time at time zone 'America/Sao_Paulo')::date = p_date
      and coalesce(b.status, 'pending') in ('pending', 'paid')
      and b.court_id is not null
  ),
  recurring_occ as (
    select
      r.court_id,
      r.start_time::time as slot_time
    from public.recurring_slots r
    join t on t.tenant_id = r.tenant_id
    where r.active = true
      and r.day_of_week = extract(dow from p_date)::int
      and r.court_id is not null
  )
  select * from booking_occ
  union
  select * from recurring_occ;
$$;

commit;
