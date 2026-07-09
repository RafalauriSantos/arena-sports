begin;

-- Security Advisor: table had RLS enabled without an explicit policy. It is
-- operational data and must remain service-role only.
alter table public.arena_closures enable row level security;

drop policy if exists arena_closures_service_all on public.arena_closures;
create policy arena_closures_service_all
  on public.arena_closures
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.arena_closures from anon, authenticated;
grant select, insert, update, delete on table public.arena_closures to service_role;

comment on table public.arena_closures is
  'Arena closure operational table. Access is restricted to service_role by RLS.';

-- Reduce the directly callable SECURITY DEFINER surface. These legacy/helper
-- RPCs are not called by the frontend or tests; public booking uses the narrow
-- fn_* RPCs and RLS policies instead.
revoke execute on function public.fn_default_saas_product_id() from anon, authenticated;
revoke execute on function public.get_founders_progress() from anon, authenticated;
revoke execute on function public.is_public_tenant(uuid) from anon, authenticated;
revoke execute on function public.is_active_court_for_tenant(uuid, uuid) from anon, authenticated;

comment on function public.fn_public_get_tenant_by_subdomain(text) is
  'Intentional public RPC for booking page read model scoped by tenant subdomain.';
comment on function public.fn_public_get_courts_by_subdomain(text) is
  'Intentional public RPC for active courts scoped by tenant subdomain.';
comment on function public.fn_public_get_occupied_slots(text, date) is
  'Intentional public RPC for occupied slots scoped by tenant subdomain and date.';
comment on function public.fn_public_get_booking_stats(text) is
  'Intentional public RPC for aggregate booking stats scoped by tenant subdomain.';

-- Existing Asaas sandbox/probe events without a matching local subscription are
-- non-actionable and should not keep production billing health in failed state.
with orphan_failed as (
  select awe.event_id
  from public.asaas_webhook_events awe
  left join public.tenant_subscriptions ts
    on ts.asaas_subscription_id = coalesce(
      awe.payload #>> '{payment,subscription}',
      awe.payload #>> '{subscription,id}'
    )
  where awe.status = 'failed'
    and awe.event_type in ('PAYMENT_OVERDUE', 'PAYMENT_REFUNDED', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
    and awe.created_at >= now() - interval '24 hours'
    and ts.tenant_id is null
)
update public.asaas_webhook_events awe
set status = 'done',
    processed_at = coalesce(awe.processed_at, now())
from orphan_failed
where awe.event_id = orphan_failed.event_id;

commit;
