-- Migration: Trial Duration Dinâmico (Teste A/B)
-- Data: 2026-01-19
-- Descrição: Atualiza função de criação de trial para suportar teste A/B (7d vs 21d)

-- Função para criar trial com duração baseada em teste A/B
CREATE OR REPLACE FUNCTION public.create_trial_subscription(
  p_tenant_id UUID,
  p_trial_days INTEGER DEFAULT NULL -- Se NULL, usa teste A/B
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id UUID;
  v_variant TEXT;
  v_final_trial_days INTEGER;
BEGIN
  -- Se não especificou dias, faz teste A/B (50/50)
  IF p_trial_days IS NULL THEN
    -- Determina variante aleatória (50/50 split)
    v_variant := CASE 
      WHEN random() < 0.5 THEN 'control_21d'
      ELSE 'test_7d'
    END;

    -- Define dias baseado na variante
    v_final_trial_days := CASE v_variant
      WHEN 'control_21d' THEN 21
      WHEN 'test_7d' THEN 7
      ELSE 21 -- fallback
    END;
  ELSE
    -- Dias especificados manualmente (admin override)
    v_final_trial_days := p_trial_days;
    v_variant := CASE
      WHEN p_trial_days = 7 THEN 'test_7d'
      WHEN p_trial_days = 21 THEN 'control_21d'
      ELSE 'legacy'
    END;
  END IF;

  -- Cria a subscription com trial
  INSERT INTO public.tenant_subscriptions (
    tenant_id,
    plan_name,
    plan_code,
    status,
    trial_started_at,
    trial_ends_at,
    trial_variant,
    monthly_price,
    billing_interval
  ) VALUES (
    p_tenant_id,
    'Trial do Plano Pro (' || v_final_trial_days || ' dias)',
    'trial',
    'trial',
    NOW(),
    NOW() + (v_final_trial_days || ' days')::INTERVAL,
    v_variant,
    0,
    'month'
  )
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

COMMENT ON FUNCTION public.create_trial_subscription IS 
'Cria trial com duração baseada em teste A/B (50/50: 7d vs 21d). 
Se p_trial_days for NULL, faz split automático. Se especificado, usa o valor direto.';

-- Garante que a função é chamada pelo trigger de onboarding
-- (Se ainda não existir, vamos validar)
DO $$
BEGIN
  -- Verifica se a função fn_onboard_user existe e atualiza se necessário
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'fn_onboard_user'
  ) THEN
    -- Atualiza para usar a nova função de trial
    CREATE OR REPLACE FUNCTION public.fn_onboard_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_tenant_id UUID;
      v_subdomain TEXT;
      v_trial_id UUID;
    BEGIN
      -- Gera subdomain único
      v_subdomain := LOWER(
        REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'business_name', 'arena'), '[^a-zA-Z0-9]', '', 'g')
      ) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

      -- Cria tenant
      INSERT INTO public.tenants (
        id,
        owner_id,
        business_name,
        subdomain,
        email
      ) VALUES (
        gen_random_uuid(),
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'Minha Arena'),
        v_subdomain,
        NEW.email
      )
      RETURNING id INTO v_tenant_id;

      -- Cria profile
      INSERT INTO public.profiles (
        id,
        tenant_id,
        full_name,
        role
      ) VALUES (
        NEW.id,
        v_tenant_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'owner'
      );

      -- Cria trial usando a nova função (teste A/B automático)
      v_trial_id := public.create_trial_subscription(v_tenant_id);

      RETURN NEW;
    END;
    $func$;

    RAISE NOTICE 'Função fn_onboard_user atualizada para usar teste A/B';
  ELSE
    RAISE NOTICE 'Função fn_onboard_user não existe ainda. Criar manualmente se necessário.';
  END IF;
END;
$$;
