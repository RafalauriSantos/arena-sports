-- Fix RLS for courts and bookings tables
--
-- Problema:
-- - Erro 403 ao acessar courts (RLS bloqueando)
-- - Erro 404 ao acessar bookings (possível problema na query ou tabela)
--
-- Solução:
-- 1. Garantir que RLS policies para courts estão corretas e aplicadas
-- 2. Garantir que RLS policies para bookings estão corretas e aplicadas
-- 3. Verificar se tabelas existem e têm estrutura correta

begin;

-- =========================
-- 1. COURTS - GARANTIR RLS E POLICIES CORRETAS
-- =========================

-- Habilitar RLS se ainda não estiver
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes para recriar (idempotente)
DROP POLICY IF EXISTS courts_owner_select ON public.courts;
DROP POLICY IF EXISTS courts_owner_insert ON public.courts;
DROP POLICY IF EXISTS courts_owner_update ON public.courts;
DROP POLICY IF EXISTS courts_owner_delete ON public.courts;
DROP POLICY IF EXISTS courts_owner_all ON public.courts;
DROP POLICY IF EXISTS courts_service_all ON public.courts;

-- Policy: Owner pode fazer SELECT nas suas próprias quadras
CREATE POLICY courts_owner_select
ON public.courts
FOR SELECT
TO authenticated
USING (public.is_tenant_owner(tenant_id));

-- Policy: Owner pode fazer INSERT nas suas próprias quadras
CREATE POLICY courts_owner_insert
ON public.courts
FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_owner(tenant_id));

-- Policy: Owner pode fazer UPDATE nas suas próprias quadras
CREATE POLICY courts_owner_update
ON public.courts
FOR UPDATE
TO authenticated
USING (public.is_tenant_owner(tenant_id))
WITH CHECK (public.is_tenant_owner(tenant_id));

-- Policy: Owner pode fazer DELETE nas suas próprias quadras
CREATE POLICY courts_owner_delete
ON public.courts
FOR DELETE
TO authenticated
USING (public.is_tenant_owner(tenant_id));

-- Policy: Service role pode tudo (para Edge Functions/RPCs)
CREATE POLICY courts_service_all
ON public.courts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courts TO authenticated;

-- =========================
-- 2. BOOKINGS - GARANTIR RLS E POLICIES CORRETAS
-- =========================

-- Verificar se tabela bookings existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings'
  ) THEN
    RAISE NOTICE 'Tabela bookings não existe. Criando...';
    -- Se a tabela não existir, criar estrutura básica
    -- (Ajuste conforme seu schema real)
    CREATE TABLE IF NOT EXISTS public.bookings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
      start_time timestamptz NOT NULL,
      end_time timestamptz NOT NULL,
      total_price numeric(10,2) DEFAULT 0,
      status text DEFAULT 'pending',
      booked_by text,
      customer_phone text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Criar índices
    CREATE INDEX IF NOT EXISTS bookings_tenant_id_idx ON public.bookings(tenant_id);
    CREATE INDEX IF NOT EXISTS bookings_court_id_idx ON public.bookings(court_id);
    CREATE INDEX IF NOT EXISTS bookings_start_time_idx ON public.bookings(start_time);
  END IF;
END $$;

-- Habilitar RLS se ainda não estiver
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Dropar policies existentes para recriar (idempotente)
DROP POLICY IF EXISTS bookings_owner_select ON public.bookings;
DROP POLICY IF EXISTS bookings_owner_insert ON public.bookings;
DROP POLICY IF EXISTS bookings_owner_update ON public.bookings;
DROP POLICY IF EXISTS bookings_owner_delete ON public.bookings;
DROP POLICY IF EXISTS bookings_service_all ON public.bookings;

-- Policy: Owner pode fazer SELECT nas suas próprias reservas
CREATE POLICY bookings_owner_select
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_tenant_owner(tenant_id));

-- Policy: Owner pode fazer INSERT nas suas próprias reservas
CREATE POLICY bookings_owner_insert
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_tenant_owner(tenant_id)
  AND EXISTS (
    SELECT 1
    FROM public.courts c
    WHERE c.id = court_id
      AND c.tenant_id = tenant_id
  )
);

-- Policy: Owner pode fazer UPDATE nas suas próprias reservas
CREATE POLICY bookings_owner_update
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_tenant_owner(tenant_id))
WITH CHECK (public.is_tenant_owner(tenant_id));

-- Policy: Owner pode fazer DELETE nas suas próprias reservas
CREATE POLICY bookings_owner_delete
ON public.bookings
FOR DELETE
TO authenticated
USING (public.is_tenant_owner(tenant_id));

-- Policy: Service role pode tudo (para Edge Functions/RPCs)
CREATE POLICY bookings_service_all
ON public.bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- =========================
-- 3. VERIFICAR SE FUNÇÃO is_tenant_owner EXISTE
-- =========================

-- Garantir que a função is_tenant_owner existe
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

-- Garantir permissões na função
GRANT EXECUTE ON FUNCTION public.is_tenant_owner(uuid) TO authenticated;

commit;

-- =========================
-- VERIFICAÇÃO: Execute estas queries para confirmar que funcionou
-- =========================

-- Verificar policies de courts
-- SELECT policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'courts';

-- Verificar policies de bookings
-- SELECT policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'bookings';

-- Verificar se função is_tenant_owner existe
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name = 'is_tenant_owner';
