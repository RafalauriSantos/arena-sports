-- Allow authenticated users to read their own tenant subscription row via profiles.tenant_id
-- This prevents the admin paywall from blocking non-owner users of the same tenant.

begin;

alter table public.tenant_subscriptions enable row level security;

-- Replace the owner-only select policy with a tenant-based select policy.
drop policy if exists tenant_subscriptions_owner_select on public.tenant_subscriptions;
drop policy if exists tenant_subscriptions_tenant_select on public.tenant_subscriptions;

create policy tenant_subscriptions_tenant_select
on public.tenant_subscriptions
for select
to authenticated
using (
  public.fn_is_saas_admin()
  or public.is_tenant_owner(tenant_id)
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.tenant_id = tenant_subscriptions.tenant_id
  )
);

commit;
