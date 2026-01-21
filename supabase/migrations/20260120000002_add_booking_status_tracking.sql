-- ============================================================================
-- Migration: Sistema de Check-in/Check-out para controle de jogos
-- Data: 2026-01-20
-- Descrição: Adiciona campos para rastrear quando os jogos começam e terminam
-- ============================================================================

BEGIN;

-- 1. Adiciona colunas para rastrear o ciclo de vida da reserva
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. Adiciona comentários explicativos
COMMENT ON COLUMN public.bookings.checked_in_at IS 'Quando o cliente fez check-in (chegou na arena)';
COMMENT ON COLUMN public.bookings.started_at IS 'Quando o jogo efetivamente começou';
COMMENT ON COLUMN public.bookings.completed_at IS 'Quando o jogo terminou';
COMMENT ON COLUMN public.bookings.cancelled_at IS 'Quando a reserva foi cancelada';

-- 3. Cria índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_bookings_started_at 
  ON public.bookings(started_at) 
  WHERE started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_completed_at 
  ON public.bookings(completed_at) 
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at 
  ON public.bookings(cancelled_at) 
  WHERE cancelled_at IS NOT NULL;

-- 4. Cria índice composto para dashboard (jogos de hoje)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_start_time 
  ON public.bookings(tenant_id, start_time DESC);

-- 5. Atualiza o enum de status (se necessário)
-- O status existente continua: pending, confirmed, paid, pending_payment, cancelled
-- Agora podemos usar: in_progress, completed

-- 6. Função helper para marcar início do jogo
CREATE OR REPLACE FUNCTION public.fn_start_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bookings
  SET started_at = NOW(),
      status = 'in_progress'
  WHERE id = p_booking_id
    AND started_at IS NULL;  -- Só permite iniciar uma vez
END;
$$;

-- 7. Função helper para marcar fim do jogo
CREATE OR REPLACE FUNCTION public.fn_complete_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bookings
  SET completed_at = NOW(),
      status = 'completed'
  WHERE id = p_booking_id
    AND completed_at IS NULL;  -- Só permite completar uma vez
END;
$$;

-- 8. Função para cancelar reserva
CREATE OR REPLACE FUNCTION public.fn_cancel_booking(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bookings
  SET cancelled_at = NOW(),
      status = 'cancelled'
  WHERE id = p_booking_id
    AND cancelled_at IS NULL;  -- Só permite cancelar uma vez
END;
$$;

-- 9. View para estatísticas do dashboard
CREATE OR REPLACE VIEW public.v_booking_stats AS
SELECT 
  tenant_id,
  -- Jogos de hoje
  COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today_total,
  COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND started_at IS NOT NULL) as today_started,
  COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND completed_at IS NOT NULL) as today_completed,
  COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND cancelled_at IS NOT NULL) as today_cancelled,
  
  -- Jogos futuros
  COUNT(*) FILTER (WHERE start_time > NOW() AND cancelled_at IS NULL) as upcoming_count,
  
  -- Jogos em andamento
  COUNT(*) FILTER (WHERE started_at IS NOT NULL AND completed_at IS NULL AND cancelled_at IS NULL) as in_progress_count,
  
  -- Total completados (histórico)
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as total_completed,
  
  -- Receita de hoje (jogos pagos)
  COALESCE(SUM(total_price) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND status IN ('paid', 'completed')), 0) as today_revenue,
  
  -- Receita total completada
  COALESCE(SUM(total_price) FILTER (WHERE completed_at IS NOT NULL), 0) as total_revenue
FROM public.bookings
GROUP BY tenant_id;

-- 10. Grants de permissão
GRANT EXECUTE ON FUNCTION public.fn_start_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_complete_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_booking(UUID) TO authenticated;
GRANT SELECT ON public.v_booking_stats TO authenticated;

COMMIT;
