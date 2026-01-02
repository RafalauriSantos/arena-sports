-- Stripe subscriptions + trial/grace paywall (MVP)
--
-- Rules:
-- - Trial: 21 days
-- - Grace: +3 days after trial (total 24 days)
-- - After grace: block everything (including public schedule)
-- - Start plan: max_staff = 0 (enforced in app logic for now)

begin;

-- Note:
-- This project may already have a public.saas_products table with a different schema.
-- This migration does NOT depend on saas_products to avoid schema conflicts.

-- =========================
-- Tenant subscriptions
-- =========================
create table if not exists public.tenant_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  plan_name text not null default 'Trial Gratuito',
  status text not null default 'trial',
  monthly_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Expand schema (compatible with existing environments)
alter table public.tenant_subscriptions
  add column if not exists plan_code text,
  add column if not exists billing_interval text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists grace_ends_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean;

-- Defaults for new columns
alter table public.tenant_subscriptions
  alter column plan_code set default 'start',
  alter column billing_interval set default 'month',
  alter column cancel_at_period_end set default false;

-- Constraints (drop+recreate to be idempotent without DO blocks)
alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_status_check;
alter table public.tenant_subscriptions
  add constraint tenant_subscriptions_status_check
  check (status in ('trial', 'active', 'past_due', 'canceled'));

alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_billing_interval_check;
alter table public.tenant_subscriptions
  add constraint tenant_subscriptions_billing_interval_check
  check (billing_interval is null or billing_interval in ('month', 'year'));

create index if not exists tenant_subscriptions_stripe_customer_idx
  on public.tenant_subscriptions (stripe_customer_id);

create index if not exists tenant_subscriptions_stripe_subscription_idx
  on public.tenant_subscriptions (stripe_subscription_id);

-- RLS
alter table public.tenant_subscriptions enable row level security;

drop policy if exists tenant_subscriptions_owner_select on public.tenant_subscriptions;
create policy tenant_subscriptions_owner_select
on public.tenant_subscriptions
for select
to authenticated
using (public.is_tenant_owner(tenant_id));

-- updated_at helper
create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_updated_at_tenant_subscriptions on public.tenant_subscriptions;
create trigger set_updated_at_tenant_subscriptions
before update on public.tenant_subscriptions
for each row
execute function public.trg_set_updated_at();

-- =========================
-- Access check for paywall
-- (SECURITY DEFINER so it can be used by policies + public RPC)
-- =========================
create or replace function public.fn_tenant_has_access(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.tenant_subscriptions%rowtype;
begin
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
    return coalesce(s.trial_ends_at, now()) > now();
  end if;

  if s.status = 'past_due' then
    return coalesce(s.grace_ends_at, now()) > now();
  end if;

  return false;
end $$;

-- =========================
-- Initialize trial/grace on tenant creation
-- =========================
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
    79,
    'trial',
    'month',
    now() + interval '21 days',
    now() + interval '24 days'
  )
  on conflict (tenant_id) do nothing;

  return new;
end $$;

drop trigger if exists trg_init_tenant_subscription on public.tenants;
create trigger trg_init_tenant_subscription
after insert on public.tenants
for each row
execute function public.fn_init_tenant_subscription();

-- Backfill for existing tenants missing subscription row
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
select
  t.id,
  'start',
  'Arena Start',
  79,
  'trial',
  'month',
  now() + interval '21 days',
  now() + interval '24 days'
from public.tenants t
where not exists (
  select 1
  from public.tenant_subscriptions s
  where s.tenant_id = t.id
);

-- =========================
-- Paywall on public schedule (courts)
-- =========================
drop policy if exists courts_public_read_active on public.courts;

create policy courts_public_read_active
on public.courts
for select
to anon
using (
  active = true
  and exists (
    select 1
    from public.tenants t
    where t.id = courts.tenant_id
      and t.subdomain is not null
      and public.fn_tenant_has_access(t.id)
  )
);

commit;