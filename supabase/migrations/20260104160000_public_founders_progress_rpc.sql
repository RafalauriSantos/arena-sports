-- Public RPC: founders progress
-- Exposes only aggregate numbers (no tenant identifiers)

create or replace function public.get_founders_progress()
returns table (cap integer, sold integer, remaining integer)
language sql
stable
security definer
set search_path = public
as $$
  with params as (
    select 100::int as cap
  ),
  agg as (
    select
      (select cap from params) as cap,
      coalesce(
        (
          select count(distinct tenant_id)
          from public.tenant_subscriptions
          where plan_code = 'pro'
            and status = 'active'
            and billing_interval = 'year'
        ),
        0
      )::int as sold
  )
  select
    agg.cap,
    agg.sold,
    greatest(agg.cap - agg.sold, 0)::int as remaining
  from agg;
$$;

revoke all on function public.get_founders_progress() from public;
grant execute on function public.get_founders_progress() to anon;
grant execute on function public.get_founders_progress() to authenticated;
