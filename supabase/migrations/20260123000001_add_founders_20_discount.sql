-- Migration: Adicionar suporte para Founders 20 (30% desconto para primeiros 20 clientes)
-- Data: 2026-01-23

-- 1. Adicionar coluna is_founder em tenant_subscriptions
ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_is_founder 
  ON public.tenant_subscriptions(is_founder) 
  WHERE is_founder = TRUE;

-- 3. Atualizar função get_founders_progress para contar apenas 20 founders
DROP FUNCTION IF EXISTS public.get_founders_progress();
CREATE OR REPLACE FUNCTION public.get_founders_progress()
RETURNS TABLE (cap integer, sold integer, remaining integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    20::int as cap,
    COUNT(*)::int as sold,
    GREATEST(0, 20 - COUNT(*))::int as remaining
  FROM public.tenant_subscriptions
  WHERE is_founder = TRUE 
    AND status IN ('active', 'trial', 'past_due');
$$;

-- 4. Comentário na coluna
COMMENT ON COLUMN public.tenant_subscriptions.is_founder IS 
  'Indica se o cliente é um dos primeiros 20 founders com desconto de 30% permanente';

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_founders_progress() TO authenticated, anon;
