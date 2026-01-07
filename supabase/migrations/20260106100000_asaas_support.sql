-- ASAAS billing support (schema + webhook event log)
--
-- Adds:
-- - tenant_subscriptions.asaas_customer_id / asaas_subscription_id / asaas_checkout_id
-- - public.asaas_webhook_events for idempotent webhook processing + auditing

begin;

-- =========================
-- Tenant subscriptions: ASAAS columns
-- =========================
alter table public.tenant_subscriptions
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists asaas_checkout_id text;

create index if not exists tenant_subscriptions_asaas_customer_idx
  on public.tenant_subscriptions (asaas_customer_id);

create index if not exists tenant_subscriptions_asaas_subscription_idx
  on public.tenant_subscriptions (asaas_subscription_id);

-- =========================
-- ASAAS webhook events (idempotency + audit)
-- =========================
create table if not exists public.asaas_webhook_events (
  event_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'processing',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.asaas_webhook_events
  drop constraint if exists asaas_webhook_events_status_check;
alter table public.asaas_webhook_events
  add constraint asaas_webhook_events_status_check
  check (status in ('processing', 'done', 'failed'));

alter table public.asaas_webhook_events enable row level security;

drop policy if exists asaas_webhook_events_saas_admin_select on public.asaas_webhook_events;
create policy asaas_webhook_events_saas_admin_select
on public.asaas_webhook_events
for select
to authenticated
using (public.fn_is_saas_admin());

drop policy if exists asaas_webhook_events_service_all on public.asaas_webhook_events;
create policy asaas_webhook_events_service_all
on public.asaas_webhook_events
for all
to service_role
using (true)
with check (true);

commit;
