-- Fix fn_tenant_has_access to grant automatic trial for tenants without subscription
-- This ensures backward compatibility for existing tenants

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