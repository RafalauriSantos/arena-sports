-- Execute estes comandos no Supabase Dashboard > SQL Editor
-- para restaurar o banco de dados

-- 1. Criar tabelas básicas
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    business_name text,
    subdomain text UNIQUE,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    settings jsonb DEFAULT '{}'::jsonb,
    saas_id uuid
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name text,
    email text,
    avatar_url text,
    job_title text
);

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    plan_code text,
    plan_name text,
    monthly_price integer,
    status text CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
    billing_interval text CHECK (billing_interval IN ('month', 'year')),
    trial_started_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    grace_ends_at timestamp with time zone,
    asaas_customer_id text,
    asaas_subscription_id text,
    asaas_checkout_id text,
    stripe_customer_id text,
    stripe_subscription_id text
);

-- 2. Criar função is_tenant_owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = p_tenant_id
      AND t.owner_id = auth.uid()
  );
$$;

-- 3. Habilitar RLS e criar políticas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY tenants_owner_select ON public.tenants
FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY profiles_self_select ON public.profiles
FOR SELECT TO authenticated USING (id = auth.uid());

-- 4. Criar função fn_tenant_has_access
CREATE OR REPLACE FUNCTION public.fn_tenant_has_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.tenant_subscriptions%rowtype;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Platform owner / support bypass
  IF public.fn_is_saas_admin() THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO s
  FROM public.tenant_subscriptions
  WHERE tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    -- No subscription found - grant automatic 21-day trial for tenants
    RETURN (SELECT created_at + interval '21 days' > now() FROM public.tenants WHERE id = p_tenant_id);
  END IF;

  IF s.status = 'active' THEN
    RETURN TRUE;
  END IF;

  IF s.status = 'trial' THEN
    RETURN coalesce(s.trial_ends_at, now()) > now();
  END IF;

  IF s.status = 'past_due' THEN
    RETURN coalesce(s.grace_ends_at, now()) > now();
  END IF;

  RETURN FALSE;
END $$;

-- 5. Criar função fn_init_tenant_subscription
CREATE OR REPLACE FUNCTION public.fn_init_tenant_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    NEW.id,
    'start',
    'Arena Start',
    79,
    'trial',
    'month',
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END $$;

-- 6. Criar trigger
CREATE TRIGGER trg_init_tenant_subscription
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.fn_init_tenant_subscription();

-- 7. Criar função fn_onboard_user (versão simplificada)
CREATE OR REPLACE FUNCTION public.fn_onboard_user(
  p_business_name text,
  p_saas_slug text DEFAULT 'arena'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_business_name text;
  v_subdomain text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create tenant
  v_business_name := COALESCE(NULLIF(TRIM(p_business_name), ''), 'Minha Arena');
  v_subdomain := LOWER(REPLACE(v_business_name, ' ', '-')) || '-' || SUBSTRING(v_user_id::text, 1, 6);

  INSERT INTO public.tenants (owner_id, business_name, subdomain)
  VALUES (v_user_id, v_business_name, v_subdomain)
  RETURNING id INTO v_tenant_id;

  -- Update profile
  UPDATE public.profiles
  SET tenant_id = v_tenant_id
  WHERE id = v_user_id;

  RETURN v_tenant_id;
END;
$$;

-- 8. Conceder permissões
GRANT EXECUTE ON FUNCTION public.fn_onboard_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_tenant_has_access(uuid) TO authenticated;

-- 9. Criar tabela saas_admin_users se não existir
CREATE TABLE IF NOT EXISTS public.saas_admin_users (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Criar função fn_is_saas_admin
CREATE OR REPLACE FUNCTION public.fn_is_saas_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.saas_admin_users a
       WHERE a.user_id = auth.uid()
     );
$$;

-- Agora você pode testar criando um usuário e tenant