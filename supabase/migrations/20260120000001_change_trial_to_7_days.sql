-- Migration: Alterar período de trial padrão de 21 para 7 dias
-- Data: 2026-01-20
-- Descrição: Reduz período de trial para aumentar conversão e reduzir desistências

-- 1. Atualizar função fn_tenant_has_access para usar 7 dias
CREATE OR REPLACE FUNCTION public.fn_tenant_has_access(p_tenant_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  s public.tenant_subscriptions%rowtype;
  v_trial_ends timestamptz;
BEGIN
  IF p_tenant_id IS NULL THEN RETURN false; END IF;
  IF public.fn_is_saas_admin() THEN RETURN true; END IF; -- Admin entra sempre

  SELECT * INTO s FROM public.tenant_subscriptions WHERE tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    -- Fallback: Se não tem assinatura, verifica se o tenant é novo (< 7 dias)
    RETURN (SELECT created_at + interval '7 days' > now() FROM public.tenants WHERE id = p_tenant_id);
  END IF;

  IF s.status = 'active' THEN RETURN true; END IF;
  
  IF s.status = 'trial' THEN
    IF s.trial_started_at IS NULL THEN RETURN false; END IF;
    v_trial_ends := COALESCE(s.trial_ends_at, s.trial_started_at + interval '7 days');
    RETURN v_trial_ends > now();
  END IF;

  IF s.status = 'past_due' THEN
    RETURN COALESCE(s.grace_ends_at, now()) > now();
  END IF;

  RETURN false;
END $$;

-- 2. Atualizar função fn_init_tenant_subscription para usar 7 dias
CREATE OR REPLACE FUNCTION public.fn_init_tenant_subscription()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  -- Criar subscription com trial_started_at = null
  -- O trial só será iniciado quando o usuário der consentimento (via ensure-tenant-subscription)
  INSERT INTO public.tenant_subscriptions (
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
  VALUES (
    new.id, 
    'start', 
    'Arena Start', 
    89, 
    'trial', 
    'month',
    NULL,  -- Trial não iniciado ainda - será iniciado após consentimento
    NULL,  -- Não definir end date sem start date
    NULL   -- Não definir grace end sem start date
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN new;
END $$;

-- 3. Comentário explicativo
COMMENT ON FUNCTION public.fn_tenant_has_access(uuid) IS 
'Verifica acesso ao tenant considerando trial de 7 dias (reduzido de 21 dias para aumentar conversão)';
