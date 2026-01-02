-- Public occupancy RPC (BookingPublic)
--
-- Objetivo: permitir que a página pública bloqueie horários ocupados
-- sem expor dados sensíveis de bookings (nome/telefone/preço).
--
-- Estratégia: função SECURITY DEFINER (dono = postgres via migrations)
-- que lê bookings/recurring_slots e retorna somente (court_id, time).

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

grant execute on function public.fn_public_get_occupied_slots(text, date) to anon;

do $$
begin
  -- Algumas instalações também usam o role "authenticated" para acesso público em preview.
  grant execute on function public.fn_public_get_occupied_slots(text, date) to authenticated;
exception
  when others then
    null;
end $$;

commit;
