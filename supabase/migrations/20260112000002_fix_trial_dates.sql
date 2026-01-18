-- Fix: fn_init_tenant_subscription não deve criar trial_ends_at sem trial_started_at
-- O trial só deve iniciar após consentimento do usuário (via ensure-tenant-subscription)

-- Drop trigger primeiro (depende da função)
drop trigger if exists trg_init_tenant_subscription on public.tenants;

-- Recriar função corrigida
create or replace function public.fn_init_tenant_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Criar subscription com trial_started_at = null
  -- O trial só será iniciado quando o usuário der consentimento (via ensure-tenant-subscription)
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
    89, 
    'trial', 
    'month',
    null,  -- Trial não iniciado ainda - será iniciado após consentimento
    null,  -- Não definir end date sem start date
    null   -- Não definir grace end sem start date
  )
  on conflict (tenant_id) do nothing;
  return new;
end $$;

-- Recriar trigger
create trigger trg_init_tenant_subscription 
after insert on public.tenants 
for each row 
execute function public.fn_init_tenant_subscription();
