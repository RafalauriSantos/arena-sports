create or replace function public.fn_init_tenant_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_subscriptions (
    tenant_id, plan_code, plan_name, monthly_price, status, billing_interval,
    trial_started_at, trial_ends_at, grace_ends_at, is_founder
  ) values (
    new.id, 'arena', 'ArenaSys', 6990, 'trial', 'month', null, null, null, false
  )
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;
