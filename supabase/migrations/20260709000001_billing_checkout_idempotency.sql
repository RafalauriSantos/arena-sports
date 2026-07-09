create table if not exists public.billing_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  request_key text not null unique,
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null default 'creating'
    check (status in ('creating', 'created', 'failed')),
  asaas_customer_id text,
  asaas_subscription_id text,
  payment_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_checkout_attempts_one_open_per_tenant
  on public.billing_checkout_attempts (tenant_id)
  where status in ('creating', 'created');

alter table public.billing_checkout_attempts enable row level security;

revoke all on table public.billing_checkout_attempts from anon, authenticated;
grant select, insert, update on table public.billing_checkout_attempts to service_role;

drop policy if exists billing_checkout_attempts_service_all
  on public.billing_checkout_attempts;
create policy billing_checkout_attempts_service_all
  on public.billing_checkout_attempts
  for all to service_role using (true) with check (true);
