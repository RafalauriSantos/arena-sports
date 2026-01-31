-- Migration: Conceder acesso total de dono ao email rafa69lauri@gmail.com
-- Data: 2026-01-25
-- Garante: perfil existente, tenant com owner_id = usuário, onboarding completo, trial ativo e (opcional) saas_admin para acesso pleno.

BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_saas_id uuid;
  v_subdomain text;
  v_email text := 'rafa69lauri@gmail.com';
BEGIN
  -- 1. Buscar user id pelo email em auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário com email % não encontrado em auth.users. Cadastre-se primeiro pelo app; depois rode esta migration novamente.', v_email;
    RETURN;
  END IF;

  -- 2. Garantir perfil (criar se não existir)
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (v_user_id, v_email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  -- 3. Se já tem tenant como owner, usar esse; senão criar um novo
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE owner_id = v_user_id
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_saas_id FROM public.saas_products WHERE slug = 'arena-sys' LIMIT 1;
    IF v_saas_id IS NULL THEN
      SELECT id INTO v_saas_id FROM public.saas_products LIMIT 1;
    END IF;
    v_subdomain := 'rafa-owner-' || REPLACE(SUBSTRING(v_user_id::text FROM 1 FOR 8), '-', '');
    INSERT INTO public.tenants (owner_id, business_name, subdomain, saas_id, email)
    VALUES (v_user_id, 'Arena Rafa (Dono)', v_subdomain, v_saas_id, v_email)
    RETURNING id INTO v_tenant_id;
    RAISE NOTICE 'Tenant criado para %: %', v_email, v_tenant_id;
  END IF;

  -- 4. Vincular perfil ao tenant e marcar onboarding como completo
  UPDATE public.profiles
  SET tenant_id = v_tenant_id, onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()), updated_at = NOW()
  WHERE id = v_user_id;

  -- 5. Garantir assinatura com trial ativo (acesso ao dashboard)
  INSERT INTO public.tenant_subscriptions (
    tenant_id, plan_code, plan_name, monthly_price, status, billing_interval,
    trial_started_at, trial_ends_at, grace_ends_at, created_at, updated_at
  )
  VALUES (
    v_tenant_id, 'pro', 'Arena Pro', 97, 'trial', 'month',
    NOW(), NOW() + INTERVAL '365 days', NOW() + INTERVAL '370 days', NOW(), NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    trial_started_at = COALESCE(tenant_subscriptions.trial_started_at, NOW()),
    trial_ends_at = GREATEST(COALESCE(tenant_subscriptions.trial_ends_at, NOW()), NOW() + INTERVAL '365 days'),
    status = 'trial',
    updated_at = NOW();

  -- 6. Inserir em saas_admin_users para acesso total (bypass paywall e acesso pleno)
  INSERT INTO public.saas_admin_users (user_id, created_at)
  VALUES (v_user_id, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Acesso de dono configurado para % (user_id: %, tenant_id: %)', v_email, v_user_id, v_tenant_id;
END $$;

COMMIT;
