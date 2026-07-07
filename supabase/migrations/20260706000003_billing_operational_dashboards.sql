begin;

alter table public.asaas_webhook_events
  add column if not exists event_type text;

alter table public.asaas_webhook_events
  add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'asaas_webhook_events'
      and column_name = 'received_at'
  ) then
    execute 'update public.asaas_webhook_events set created_at = received_at where created_at is null and received_at is not null';
  end if;
end $$;

update public.asaas_webhook_events
set created_at = now()
where created_at is null;

alter table public.asaas_webhook_events
  alter column created_at set default now(),
  alter column created_at set not null;

create index if not exists idx_asaas_webhook_events_status_created
  on public.asaas_webhook_events (status, created_at desc);

create index if not exists idx_asaas_webhook_events_type_created
  on public.asaas_webhook_events (event_type, created_at desc);

create index if not exists idx_tenant_subscriptions_status_updated
  on public.tenant_subscriptions (status, updated_at desc);

create table if not exists public.billing_operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  source text not null default 'system',
  function_name text,
  tenant_id uuid references public.tenants(id) on delete set null,
  subscription_id text,
  payment_id text,
  webhook_event_id text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.billing_operational_events enable row level security;

drop policy if exists billing_operational_events_service_all on public.billing_operational_events;
create policy billing_operational_events_service_all
  on public.billing_operational_events
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_billing_operational_events_created
  on public.billing_operational_events (created_at desc);

create index if not exists idx_billing_operational_events_type_created
  on public.billing_operational_events (event_type, created_at desc);

create index if not exists idx_billing_operational_events_severity_created
  on public.billing_operational_events (severity, created_at desc);

create index if not exists idx_billing_operational_events_tenant_created
  on public.billing_operational_events (tenant_id, created_at desc);

create or replace view public.billing_ops_health_summary
with (security_invoker = true)
as
with facts as (
  select
    (
      select max(created_at)
      from public.asaas_webhook_events
      where event_id not like 'reconcile:%'
    ) as last_real_webhook_at,
    (
      select max(created_at)
      from public.billing_operational_events
      where event_type = 'reconciliation_run_finished'
    ) as last_reconciliation_at,
    (
      select count(*)::integer
      from public.asaas_webhook_events
      where status = 'failed'
        and created_at >= now() - interval '24 hours'
    ) as failed_webhooks_24h,
    (
      select count(*)::integer
      from public.asaas_webhook_events
      where status = 'processing'
        and created_at < now() - interval '15 minutes'
    ) as stuck_processing_webhooks,
    (
      select count(*)::integer
      from public.billing_operational_events
      where severity in ('error', 'critical')
        and created_at >= now() - interval '1 hour'
    ) as billing_errors_1h,
    (
      select count(*)::integer
      from public.billing_operational_events
      where event_type = 'webhook_duplicate_ignored'
        and created_at >= now() - interval '1 hour'
    ) as duplicate_webhooks_1h,
    (
      select count(*)::integer
      from public.billing_operational_events
      where event_type = 'webhook_event_ignored'
        and created_at >= now() - interval '1 hour'
    ) as ignored_webhooks_1h,
    (
      select count(*)::integer
      from public.tenant_subscriptions
      where asaas_subscription_id is not null
        and status = 'trial'
        and coalesce(updated_at, created_at) < now() - interval '30 minutes'
    ) as payment_stuck_count,
    (
      select count(*)::integer
      from public.tenant_subscriptions
      where status in ('past_due', 'cancelled')
        or (status = 'trial' and trial_ends_at is not null and trial_ends_at < now())
    ) as blocked_or_expired_tenants,
    (
      select count(*)::integer
      from public.tenant_subscriptions
      where status = 'active'
    ) as active_subscriptions,
    (
      select count(*)::integer
      from public.tenant_subscriptions
      where asaas_subscription_id is not null
    ) as billable_subscriptions
)
select
  now() as generated_at,
  last_real_webhook_at,
  last_reconciliation_at,
  failed_webhooks_24h,
  stuck_processing_webhooks,
  billing_errors_1h,
  duplicate_webhooks_1h,
  ignored_webhooks_1h,
  payment_stuck_count,
  blocked_or_expired_tenants,
  active_subscriptions,
  billable_subscriptions
from facts;

create or replace view public.billing_ops_alerts
with (security_invoker = true)
as
with facts as (
  select * from public.billing_ops_health_summary
)
select
  'critical'::text as severity,
  'webhook_stopped'::text as alert_key,
  'Webhook do Asaas sem eventos recentes'::text as title,
  'Nenhum webhook real do Asaas foi registrado nas ultimas 2 horas.'::text as details,
  coalesce(last_real_webhook_at::text, 'never') as current_value,
  'last_real_webhook_at >= now() - 2 hours'::text as threshold_value,
  generated_at
from facts
where coalesce(last_real_webhook_at, '1970-01-01'::timestamptz) < now() - interval '2 hours'
union all
select
  'critical'::text,
  'reconciliation_stopped'::text,
  'Reconciliacao automatica sem execucao recente'::text,
  'O job de reconciliacao nao registrou conclusao nos ultimos 45 minutos.',
  coalesce(last_reconciliation_at::text, 'never'),
  'last_reconciliation_at >= now() - 45 minutes',
  generated_at
from facts
where coalesce(last_reconciliation_at, '1970-01-01'::timestamptz) < now() - interval '45 minutes'
union all
select
  'high'::text,
  'failed_webhooks'::text,
  'Webhooks com falha nas ultimas 24 horas'::text,
  'Eventos persistidos como failed precisam ser reprocessados ou investigados.',
  failed_webhooks_24h::text,
  '= 0',
  generated_at
from facts
where failed_webhooks_24h > 0
union all
select
  'high'::text,
  'webhooks_stuck_processing'::text,
  'Webhooks presos em processing'::text,
  'Eventos ficaram em processing por mais de 15 minutos.',
  stuck_processing_webhooks::text,
  '= 0',
  generated_at
from facts
where stuck_processing_webhooks > 0
union all
select
  'high'::text,
  'payment_stuck'::text,
  'Pagamentos pendentes sem ativacao'::text,
  'Assinaturas com ID do Asaas seguem em trial depois de 30 minutos.',
  payment_stuck_count::text,
  '= 0',
  generated_at
from facts
where payment_stuck_count > 0
union all
select
  'high'::text,
  'billing_function_errors'::text,
  'Erros recentes em billing'::text,
  'Eventos operacionais de erro ou critical foram registrados na ultima hora.',
  billing_errors_1h::text,
  '= 0',
  generated_at
from facts
where billing_errors_1h > 0
union all
select
  'warning'::text,
  'webhook_duplicate_spike'::text,
  'Volume alto de webhooks duplicados'::text,
  'Mais de 20 duplicidades foram ignoradas na ultima hora.',
  duplicate_webhooks_1h::text,
  '<= 20 per hour',
  generated_at
from facts
where duplicate_webhooks_1h > 20
union all
select
  'warning'::text,
  'webhook_ignored_spike'::text,
  'Eventos de webhook ignorados'::text,
  'Eventos sem efeito operacional foram ignorados na ultima hora.',
  ignored_webhooks_1h::text,
  '= 0',
  generated_at
from facts
where ignored_webhooks_1h > 0
union all
select
  'warning'::text,
  'tenant_blocked_or_expired'::text,
  'Tenants bloqueados, vencidos ou cancelados'::text,
  'Existem arenas sem acesso ativo ou com trial expirado.',
  blocked_or_expired_tenants::text,
  '= 0 for customer-success queue',
  generated_at
from facts
where blocked_or_expired_tenants > 0;

create or replace view public.billing_ops_tenant_risks
with (security_invoker = true)
as
select
  ts.tenant_id,
  t.business_name,
  ts.status,
  ts.asaas_subscription_id,
  'payment_stuck'::text as issue_key,
  'high'::text as severity,
  'Assinatura com ID do Asaas ainda em trial apos 30 minutos.'::text as description,
  coalesce(ts.updated_at, ts.created_at) as last_changed_at,
  now() as detected_at
from public.tenant_subscriptions ts
left join public.tenants t on t.id = ts.tenant_id
where ts.asaas_subscription_id is not null
  and ts.status = 'trial'
  and coalesce(ts.updated_at, ts.created_at) < now() - interval '30 minutes'
union all
select
  ts.tenant_id,
  t.business_name,
  ts.status,
  ts.asaas_subscription_id,
  'trial_expired'::text,
  'high'::text,
  'Trial expirado sem assinatura ativa.',
  ts.trial_ends_at,
  now()
from public.tenant_subscriptions ts
left join public.tenants t on t.id = ts.tenant_id
where ts.status = 'trial'
  and ts.trial_ends_at is not null
  and ts.trial_ends_at < now()
union all
select
  ts.tenant_id,
  t.business_name,
  ts.status,
  ts.asaas_subscription_id,
  'tenant_blocked'::text,
  case when ts.status = 'past_due' then 'high' else 'warning' end,
  case
    when ts.status = 'past_due' then 'Assinatura em atraso; acesso pode estar bloqueado ou em grace period.'
    else 'Assinatura cancelada; confirmar se o bloqueio e intencional.'
  end,
  coalesce(ts.updated_at, ts.created_at),
  now()
from public.tenant_subscriptions ts
left join public.tenants t on t.id = ts.tenant_id
where ts.status in ('past_due', 'cancelled')
union all
select
  ts.tenant_id,
  t.business_name,
  ts.status,
  ts.asaas_subscription_id,
  'failed_webhook_for_subscription'::text,
  'high'::text,
  'Existe webhook failed vinculado a esta assinatura.',
  awe.created_at,
  now()
from public.tenant_subscriptions ts
left join public.tenants t on t.id = ts.tenant_id
join public.asaas_webhook_events awe
  on coalesce(
    awe.payload #>> '{payment,subscription}',
    awe.payload #>> '{subscription,id}'
  ) = ts.asaas_subscription_id
where awe.status = 'failed';

create or replace view public.billing_ops_recent_events
with (security_invoker = true)
as
select
  created_at,
  severity,
  event_type,
  source,
  function_name,
  tenant_id,
  subscription_id,
  payment_id,
  webhook_event_id,
  message,
  metadata
from public.billing_operational_events
order by created_at desc
limit 500;

revoke all on table public.billing_operational_events from anon, authenticated;
revoke all on public.billing_ops_health_summary from anon, authenticated;
revoke all on public.billing_ops_alerts from anon, authenticated;
revoke all on public.billing_ops_tenant_risks from anon, authenticated;
revoke all on public.billing_ops_recent_events from anon, authenticated;

grant select, insert on table public.billing_operational_events to service_role;
grant select on public.billing_ops_health_summary to service_role;
grant select on public.billing_ops_alerts to service_role;
grant select on public.billing_ops_tenant_risks to service_role;
grant select on public.billing_ops_recent_events to service_role;

commit;
