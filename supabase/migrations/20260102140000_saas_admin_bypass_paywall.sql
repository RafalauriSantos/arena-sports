-- SaaS admin bypass for paywall
--
-- Goal: allow the platform owner (creator/support) to access the admin app
-- even after trial/grace, without forcing payment.
--
-- How it works:
-- - A small allowlist table: public.saas_admin_users(user_id)
-- - A helper function: public.fn_is_saas_admin()
-- - public.fn_tenant_has_access() now returns TRUE for saas admins

begin;

create table if not exists public.saas_admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

-- RLS: users can only see their own row; service_role can manage all.
alter table public.saas_admin_users enable row level security;

drop policy if exists saas_admin_users_self_select on public.saas_admin_users;
create policy saas_admin_users_self_select
on public.saas_admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists saas_admin_users_service_all on public.saas_admin_users;
create policy saas_admin_users_service_all
on public.saas_admin_users
for all
to service_role
using (true)
with check (true);

-- Helper: is the current authenticated user a SaaS admin?
create or replace function public.fn_is_saas_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.saas_admin_users a
       where a.user_id = auth.uid()
     );
$$;

-- Update paywall access check to allow SaaS admins.
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
    -- No subscription found - grant automatic 21-day trial for new tenants
    -- This ensures backward compatibility for tenants created before subscription system
    return (select created_at + interval '21 days' > now() from public.tenants where id = p_tenant_id);
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

commit;
