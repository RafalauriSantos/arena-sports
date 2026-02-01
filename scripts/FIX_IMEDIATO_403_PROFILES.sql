-- FIX IMEDIATO: Erro 403 ao acessar profiles
-- Execute este SQL diretamente no Supabase Dashboard > SQL Editor
-- Isso corrige o problema imediatamente sem precisar de migrations

BEGIN;

-- =========================
-- 1. CRIAR PERFIL PARA USUÁRIOS EXISTENTES QUE NÃO TÊM
-- =========================

-- Criar função SECURITY DEFINER para criar perfis (bypass RLS)
CREATE OR REPLACE FUNCTION public.fix_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfis para todos os usuários em auth.users que não têm perfil
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  SELECT 
      au.id,
      au.email,
      au.created_at,
      now()
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Executar a função para criar perfis faltantes
SELECT public.fix_missing_profiles();

-- Limpar função temporária (opcional, pode deixar para uso futuro)
-- DROP FUNCTION IF EXISTS public.fix_missing_profiles();

-- =========================
-- 2. GARANTIR RLS E POLICIES CORRETAS
-- =========================

-- Habilitar RLS se ainda não estiver
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_self_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_service_all ON public.profiles;

-- Recriar policies corretamente
CREATE POLICY profiles_self_select
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY profiles_self_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_delete
ON public.profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- Policy para service_role (Edge Functions)
CREATE POLICY profiles_service_all
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================
-- 3. CRIAR FUNÇÃO PARA CRIAR PERFIL NO SIGNUP
-- =========================
-- NOTA: No Supabase, triggers no schema auth podem ter limitações
-- Por isso, a função fn_onboard_user já cria o perfil se não existir
-- Este trigger é um backup adicional

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil automaticamente quando usuário é criado
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Tentar criar trigger (pode falhar por permissões, mas não é crítico)
-- Se falhar, o perfil será criado via RPC fn_onboard_user ou client-side
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Trigger não pode ser criado por falta de permissões (normal no Supabase)
    RAISE NOTICE 'Trigger não pode ser criado por limitações de permissão. Perfis serão criados via RPC/client-side.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar trigger: %', SQLERRM;
END $$;

-- =========================
-- 4. CRIAR FUNÇÃO get_founders_progress (evitar erro 404)
-- =========================

CREATE OR REPLACE FUNCTION public.get_founders_progress()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT '{"active": 0, "trial": 0, "total": 0}'::jsonb;
$$;

GRANT EXECUTE ON FUNCTION public.get_founders_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_founders_progress() TO anon;

-- =========================
-- 5. GARANTIR QUE PERMISSÕES ESTÃO CORRETAS
-- =========================

-- Garantir que authenticated tem permissão para usar a tabela profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT USAGE ON SEQUENCE IF EXISTS profiles_id_seq TO authenticated;

COMMIT;

-- =========================
-- VERIFICAÇÃO: Execute estas queries para confirmar que funcionou
-- =========================

-- Verificar se RLS está habilitado
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles';

-- Verificar policies criadas
-- SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

-- Verificar se todos os usuários têm perfil
-- SELECT COUNT(*) as total_users FROM auth.users;
-- SELECT COUNT(*) as total_profiles FROM public.profiles;
-- SELECT COUNT(*) as users_sem_perfil FROM auth.users au LEFT JOIN public.profiles p ON p.id = au.id WHERE p.id IS NULL;
