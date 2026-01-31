-- Migration: Garantir acesso a profiles para login e cadastro
-- Data: 2026-01-24
-- Problema: Usuários não conseguem criar conta nem acessar (RLS ou trigger quebrado)

BEGIN;

-- ==============================================================================
-- 1. GARANTIR POLÍTICAS RLS EM PROFILES (autenticado só acessa próprio perfil)
-- ==============================================================================
DROP POLICY IF EXISTS profiles_self_access ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_self_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_service_all ON public.profiles;

CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY profiles_self_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_delete ON public.profiles
  FOR DELETE TO authenticated USING (id = auth.uid());

CREATE POLICY profiles_service_all ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 2. GRANTS
-- ==============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ==============================================================================
-- 3. TRIGGER: criar perfil ao cadastrar usuário (auth.users)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. FUNÇÃO DE FALLBACK: criar perfil via RPC (quando cliente falha por RLS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_profile_if_missing(p_user_id uuid, p_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (p_user_id, COALESCE(p_email, (SELECT email FROM auth.users WHERE id = p_user_id)), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_profile_if_missing(uuid, text) TO authenticated;

-- ==============================================================================
-- 5. GARANTIR fn_onboard_user(text, text) EXISTE (RPC usada pelo app)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_onboard_user(p_business_name text, p_saas_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_saas_id uuid;
  v_subdomain text;
  v_user_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (v_user_id, v_user_email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
  IF v_tenant_id IS NOT NULL THEN RETURN v_tenant_id; END IF;

  SELECT id INTO v_saas_id FROM public.saas_products WHERE slug = p_saas_slug LIMIT 1;
  IF v_saas_id IS NULL THEN
    SELECT id INTO v_saas_id FROM public.saas_products LIMIT 1;
  END IF;

  v_subdomain := lower(regexp_replace(p_business_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || left(replace(v_user_id::text, '-', ''), 6);

  INSERT INTO public.tenants (owner_id, business_name, subdomain, saas_id, email)
  VALUES (v_user_id, p_business_name, v_subdomain, v_saas_id, v_user_email)
  RETURNING id INTO v_tenant_id;

  UPDATE public.profiles SET tenant_id = v_tenant_id, updated_at = NOW() WHERE id = v_user_id;

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_onboard_user(text, text) TO authenticated;

COMMIT;
