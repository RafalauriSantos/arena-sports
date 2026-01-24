-- Migration: Corrigir políticas RLS da tabela profiles
-- Data: 2026-01-23
-- Problema: Erro 403 ao criar/atualizar perfil no login (violação de RLS)

BEGIN;

-- ==============================================================================
-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ==============================================================================
DROP POLICY IF EXISTS profiles_self_access ON public.profiles;
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_self_delete ON public.profiles;
DROP POLICY IF EXISTS profiles_service_all ON public.profiles;

-- ==============================================================================
-- 2. CRIAR POLÍTICAS SEPARADAS PARA MELHOR CONTROLE
-- ==============================================================================

-- SELECT: Usuário autenticado pode ler seu próprio perfil
CREATE POLICY profiles_self_select
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- INSERT: Usuário autenticado pode criar seu próprio perfil (apenas com seu próprio ID)
CREATE POLICY profiles_self_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: Usuário autenticado pode atualizar seu próprio perfil
CREATE POLICY profiles_self_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- DELETE: Usuário autenticado pode deletar seu próprio perfil (opcional, mas útil)
CREATE POLICY profiles_self_delete
ON public.profiles
FOR DELETE
TO authenticated
USING (id = auth.uid());

-- ==============================================================================
-- 3. POLÍTICA PARA SERVICE_ROLE (Edge Functions)
-- ==============================================================================
DROP POLICY IF EXISTS profiles_service_all ON public.profiles;
CREATE POLICY profiles_service_all
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 4. GARANTIR PERMISSÕES CORRETAS
-- ==============================================================================
-- Garantir que authenticated tem permissões na tabela
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Garantir que service_role tem todas as permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ==============================================================================
-- 5. CRIAR FUNÇÃO SECURITY DEFINER PARA CRIAR PERFIL (BACKUP)
-- ==============================================================================
-- Esta função pode ser usada como fallback se as políticas RLS ainda falharem
CREATE OR REPLACE FUNCTION public.create_profile_if_missing(p_user_id uuid, p_email text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil apenas se não existir
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    p_user_id,
    p_email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant para authenticated usar a função
GRANT EXECUTE ON FUNCTION public.create_profile_if_missing(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.create_profile_if_missing(uuid, text) IS 
  'Função SECURITY DEFINER para criar perfil se não existir. Bypass RLS para garantir criação.';

COMMIT;

-- ==============================================================================
-- VERIFICAÇÃO (opcional - executar manualmente se necessário)
-- ==============================================================================
-- Verificar políticas criadas:
-- SELECT policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'profiles';
