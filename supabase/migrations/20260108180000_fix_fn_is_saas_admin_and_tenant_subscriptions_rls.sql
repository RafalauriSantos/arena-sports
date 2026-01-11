-- Fix fn_is_saas_admin function and tenant_subscriptions RLS
--
-- Problemas:
-- - Erro 404: fn_is_saas_admin não existe no banco remoto
-- - Erro 403: tenant_subscriptions RLS policy depende de fn_is_saas_admin
-- - Se fn_is_saas_admin não existir, policy falha e retorna 403
--
-- Solução:
-- 1. Criar fn_is_saas_admin se não existir
-- 2. Criar tabela saas_admin_users se não existir
-- 3. Garantir que tenant_subscriptions RLS funciona mesmo se função retornar false
-- 4. Adicionar policy de fallback para tenant_subscriptions

begin;

-- =========================
-- 1. SAAS_ADMIN_USERS (Tabela de admins da plataforma)
-- =========================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.saas_admin_users (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS se ainda não estiver
ALTER TABLE public.saas_admin_users ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes para recriar (idempotente)
DROP POLICY IF EXISTS saas_admin_users_self_select ON public.saas_admin_users;
DROP POLICY IF EXISTS saas_admin_users_service_all ON public.saas_admin_users;

-- Policy: Usuário pode ver apenas sua própria linha
CREATE POLICY saas_admin_users_self_select
ON public.saas_admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Service role pode tudo
CREATE POLICY saas_admin_users_service_all
ON public.saas_admin_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================
-- 2. FN_IS_SAAS_ADMIN (Função para verificar se é admin)
-- =========================

-- DROP com CASCADE para remover dependências (policies que usam a função)
DROP FUNCTION IF EXISTS public.fn_is_saas_admin() CASCADE;

-- Criar função
CREATE OR REPLACE FUNCTION public.fn_is_saas_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.saas_admin_users a
        WHERE a.user_id = auth.uid()
    );
$$;

-- Conceder permissão para authenticated executar
GRANT EXECUTE ON FUNCTION public.fn_is_saas_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_saas_admin() TO anon;

-- =========================
-- 3. TENANT_SUBSCRIPTIONS RLS (Garantir policies corretas)
-- =========================

-- Garantir que RLS está habilitado
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes para recriar (idempotente)
-- Como usamos CASCADE no DROP FUNCTION, policies dependentes já foram removidas
-- Mas garantimos limpando qualquer nome que possa ter sobrado
DROP POLICY IF EXISTS tenant_subscriptions_owner_select ON public.tenant_subscriptions;
DROP POLICY IF EXISTS tenant_subscriptions_tenant_select ON public.tenant_subscriptions;
DROP POLICY IF EXISTS tenant_subscriptions_service_all ON public.tenant_subscriptions;
DROP POLICY IF EXISTS tenant_subscriptions_select_policy ON public.tenant_subscriptions;

-- Policy: Tenant-based select (permite owner E membros do tenant)
CREATE POLICY tenant_subscriptions_tenant_select
ON public.tenant_subscriptions
FOR SELECT
TO authenticated
USING (
    -- Admin vê tudo
    (SELECT public.fn_is_saas_admin())
    OR
    -- Dono vê sua arena
    public.is_tenant_owner(tenant_id)
    OR
    -- Funcionário vê a arena onde trabalha
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.tenant_id = tenant_subscriptions.tenant_id
    )
);

-- Policy: Service role pode tudo (para Edge Functions/webhooks)
CREATE POLICY tenant_subscriptions_service_all
ON public.tenant_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Garantir permissão SELECT para authenticated
GRANT SELECT ON public.tenant_subscriptions TO authenticated;

-- =========================
-- 4. GARANTIR IS_TENANT_OWNER EXISTE (dependência das policies)
-- =========================

-- DROP com CASCADE para remover dependências
DROP FUNCTION IF EXISTS public.is_tenant_owner(uuid) CASCADE;

-- Criar função is_tenant_owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.tenants t
        WHERE t.id = p_tenant_id
          AND t.owner_id = auth.uid()
    );
$$;

-- Conceder permissão para authenticated executar
GRANT EXECUTE ON FUNCTION public.is_tenant_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_owner(uuid) TO anon;

commit;
