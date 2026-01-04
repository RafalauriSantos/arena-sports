-- Trial should start after user consent (first login notice)
-- Adds trial_started_at and adjusts access checks + init trigger

begin;

alter table public.tenant_subscriptions
  add column if not exists trial_started_at timestamptz;

-- Backfill: existing trials that already have trial_ends_at are considered started
update public.tenant_subscriptions
set trial_started_at = coalesce(trial_started_at, created_at, now())
where status = 'trial'
  and trial_started_at is null
  and trial_ends_at is not null;

-- Access check: trial only grants access after trial_started_at is set
create or replace function public.fn_tenant_has_access(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.tenant_subscriptions%rowtype;
  v_trial_ends timestamptz;
begin
  if p_tenant_id is null then
    return false;
  end if;

  -- Platform owner / support bypass
  if public.fn_is_saas_admin() then
    return true;
  end if;

  select * into s
  from public.tenant_subscriptions
  where tenant_id = p_tenant_id;

  if not found then
    return false;
  end if;

  if s.status = 'active' then
    return true;
  end if;

  if s.status = 'trial' then
    if s.trial_started_at is null then
      return false;
    end if;

    v_trial_ends := coalesce(s.trial_ends_at, s.trial_started_at + interval '21 days');
    return v_trial_ends > now();
  end if;

  if s.status = 'past_due' then
    return coalesce(s.grace_ends_at, now()) > now();
  end if;

  return false;
end $$;

-- Init subscription row on tenant creation, but do NOT start trial until consent
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
    trial_started_at,
    trial_ends_at,
    grace_ends_at
  )
  values (
    new.id,
    'start',
    'Arena Start',
    79,
    'trial',
    'month',
    null,
    null,
    null
  )
  on conflict (tenant_id) do nothing;

  return new;
end $$;

commit;
