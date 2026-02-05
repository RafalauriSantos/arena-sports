-- ==========================================
-- CORREÇÃO DE SEGURANÇA: SECURITY DEFINER VIEWS
-- ==========================================
-- Problema: Views com SECURITY DEFINER expõem dados de todos os tenants
-- Solução: Remover views inseguras e criar funções RPC com filtros

-- 1. REMOVER VIEW v_tenants_with_address (não é usada no código público)
-- Já existe fn_public_get_tenant_by_subdomain que é segura
DROP VIEW IF EXISTS public.v_tenants_with_address;

-- 2. REMOVER PERMISSÃO PÚBLICA DA v_booking_stats
-- Essa view é usada apenas em scripts admin/teste, não precisa ser pública
REVOKE SELECT ON public.v_booking_stats FROM anon;
-- Mantém apenas para usuários autenticados (que já têm RLS aplicado)
-- A view ainda pode ser útil para dashboards administrativos internos

-- 3. CRIAR FUNÇÃO RPC SEGURA PARA STATS PÚBLICAS (se necessário no futuro)
-- Esta função retorna APENAS stats do tenant especificado via subdomain
CREATE OR REPLACE FUNCTION public.fn_public_get_booking_stats(p_subdomain TEXT)
RETURNS TABLE (
  today_total BIGINT,
  today_started BIGINT,
  today_completed BIGINT,
  today_cancelled BIGINT,
  upcoming_count BIGINT,
  in_progress_count BIGINT,
  total_completed BIGINT,
  today_revenue NUMERIC,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- 1. Resolve tenant_id a partir do subdomain (ÚNICO filtro de segurança)
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE subdomain = p_subdomain;

  -- 2. Se não encontrou o tenant, retorna vazio
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- 3. Retorna stats APENAS desse tenant
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today_total,
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND started_at IS NOT NULL) as today_started,
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND completed_at IS NOT NULL) as today_completed,
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND cancelled_at IS NOT NULL) as today_cancelled,
    COUNT(*) FILTER (WHERE start_time > NOW() AND cancelled_at IS NULL) as upcoming_count,
    COUNT(*) FILTER (WHERE started_at IS NOT NULL AND completed_at IS NULL AND cancelled_at IS NULL) as in_progress_count,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as total_completed,
    COALESCE(SUM(total_price) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND status IN ('paid', 'completed')), 0) as today_revenue,
    COALESCE(SUM(total_price) FILTER (WHERE completed_at IS NOT NULL), 0) as total_revenue
  FROM public.bookings
  WHERE tenant_id = v_tenant_id;
END;
$$;

-- 4. CRIAR FUNÇÃO PARA ADMIN (com filtro por tenant_id direto)
CREATE OR REPLACE FUNCTION public.fn_get_booking_stats_admin(p_tenant_id UUID)
RETURNS TABLE (
  today_total BIGINT,
  today_started BIGINT,
  today_completed BIGINT,
  today_cancelled BIGINT,
  upcoming_count BIGINT,
  in_progress_count BIGINT,
  total_completed BIGINT,
  today_revenue NUMERIC,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Retorna stats do tenant especificado
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today_total,
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND started_at IS NOT NULL) as today_started,
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND completed_at IS NOT NULL) as today_completed,
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND cancelled_at IS NOT NULL) as today_cancelled,
    COUNT(*) FILTER (WHERE start_time > NOW() AND cancelled_at IS NULL) as upcoming_count,
    COUNT(*) FILTER (WHERE started_at IS NOT NULL AND completed_at IS NULL AND cancelled_at IS NULL) as in_progress_count,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as total_completed,
    COALESCE(SUM(total_price) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND status IN ('paid', 'completed')), 0) as today_revenue,
    COALESCE(SUM(total_price) FILTER (WHERE completed_at IS NOT NULL), 0) as total_revenue
  FROM public.bookings
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- 5. PERMISSÕES
-- Função pública (filtra por subdomain)
GRANT EXECUTE ON FUNCTION public.fn_public_get_booking_stats(TEXT) TO anon, authenticated;

-- Função admin (apenas autenticados)
GRANT EXECUTE ON FUNCTION public.fn_get_booking_stats_admin(UUID) TO authenticated;

-- 6. COMENTÁRIOS
COMMENT ON FUNCTION public.fn_public_get_booking_stats IS 
'Retorna estatísticas de bookings de um tenant específico via subdomain. Seguro para acesso público.';

COMMENT ON FUNCTION public.fn_get_booking_stats_admin IS 
'Retorna estatísticas de bookings de um tenant específico via tenant_id. Apenas para usuários autenticados.';

-- 7. NOTA DE SEGURANÇA
-- A view v_booking_stats ainda existe mas:
-- - SEM permissão para anon (público)
-- - COM permissão para authenticated (admin)
-- - Pode ser dropada no futuro se não for mais necessária
