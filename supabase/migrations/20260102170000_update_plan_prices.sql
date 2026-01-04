-- Update plan prices (Start/Pro)
-- Start: 89
-- Pro: 169

begin;

-- Update init function to use new Start price
create or replace function public.fn_init_tenant_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_subscriptions (
    tenant_id,
    plan_code,
    plan_name,
    monthly_price,
    status,
    billing_interval,
    trial_ends_at,
    grace_ends_at
  )
  values (
    new.id,
    'start',
    'Arena Start',
    89,
    'trial',
    'month',
    now() + interval '21 days',
    now() + interval '24 days'
  )
  on conflict (tenant_id) do nothing;

  return new;
end $$;

-- Keep existing tenants consistent (only if they are still on Start)
update public.tenant_subscriptions
set monthly_price = 89,
    plan_name = 'Arena Start',
    updated_at = now()
where plan_code = 'start'
  and (monthly_price is null or monthly_price <> 89);

-- If Pro is already in use, normalize its price/name too
update public.tenant_subscriptions
set monthly_price = 169,
    plan_name = 'Arena Pro',
    updated_at = now()
where plan_code = 'pro'
  and (monthly_price is null or monthly_price <> 169);

commit;
