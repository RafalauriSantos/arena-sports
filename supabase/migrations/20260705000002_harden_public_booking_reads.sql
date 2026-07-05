-- Keep the public booking page functional without exposing direct table reads
-- across tenants. Public callers receive only active court fields for a known
-- tenant subdomain through a narrow RPC.

create or replace function public.fn_public_get_courts_by_subdomain(p_subdomain text)
returns table(
  id uuid,
  name text,
  base_price numeric,
  half_hour_price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.base_price,
    c.half_hour_price
  from public.tenants t
  join public.courts c on c.tenant_id = t.id
  where lower(trim(t.subdomain)) = lower(trim(p_subdomain))
    and t.subdomain is not null
    and trim(t.subdomain) <> ''
    and c.active = true
  order by c.base_price asc, c.name asc;
$$;

revoke execute on function public.fn_public_get_courts_by_subdomain(text) from public;
grant execute on function public.fn_public_get_courts_by_subdomain(text) to anon, authenticated;

drop policy if exists courts_public_read_active on public.courts;
drop policy if exists courts_public_read_active_anon on public.courts;
drop policy if exists tenants_public_read_by_subdomain on public.tenants;
revoke all on public.public_courts_view from anon, authenticated;

comment on function public.fn_public_get_courts_by_subdomain(text) is
  'Public read model for active courts scoped by tenant subdomain.';
