-- Grant service_role access to webhook audit table and tenant_subscriptions
-- Ensures Edge Functions using the service role can insert/update these tables

begin;

grant select, insert, update on table public.asaas_webhook_events to service_role;
grant select, insert, update on table public.tenant_subscriptions to service_role;

commit;
