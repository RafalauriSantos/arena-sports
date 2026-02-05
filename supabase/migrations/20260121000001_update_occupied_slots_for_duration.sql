-- ============================================================================
-- Migration: Atualizar função fn_public_get_occupied_slots para considerar duração
-- Data: 2026-01-21
-- Descrição: A função agora retorna todos os slots ocupados considerando a duração
--            Se uma reserva vai das 7h às 8h30, retorna tanto 7h quanto 8h como ocupados
-- ============================================================================

BEGIN;

-- Atualiza a função para considerar a duração das reservas
DROP FUNCTION IF EXISTS public.fn_public_get_occupied_slots(text, date);

CREATE OR REPLACE FUNCTION public.fn_public_get_occupied_slots(p_subdomain text, p_date date)
RETURNS TABLE (court_id uuid, slot_time time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (
    SELECT id AS tenant_id FROM public.tenants
    WHERE subdomain = p_subdomain AND subdomain IS NOT NULL
    AND public.fn_tenant_has_access(id) -- O Paywall Check
    LIMIT 1
  ),
  booking_occ AS (
    -- Retorna todos os slots de hora em hora que estão ocupados pela reserva
    -- Se uma reserva vai das 7h às 8h30, retorna 7h e 8h
    SELECT DISTINCT
      b.court_id,
      (b.start_time AT TIME ZONE 'America/Sao_Paulo')::time AS slot_time
    FROM public.bookings b
    JOIN t ON t.tenant_id = b.tenant_id
    WHERE (b.start_time AT TIME ZONE 'America/Sao_Paulo')::date = p_date
      AND COALESCE(b.status, 'pending') IN ('pending', 'paid', 'pending_payment', 'confirmed', 'in_progress')
      AND b.court_id IS NOT NULL
      AND b.cancelled_at IS NULL
    
    UNION
    
    -- Se a reserva tem duração > 1h, também marca o próximo slot como ocupado
    SELECT DISTINCT
      b.court_id,
      ((b.start_time AT TIME ZONE 'America/Sao_Paulo') + interval '1 hour')::time AS slot_time
    FROM public.bookings b
    JOIN t ON t.tenant_id = b.tenant_id
    WHERE (b.start_time AT TIME ZONE 'America/Sao_Paulo')::date = p_date
      AND COALESCE(b.status, 'pending') IN ('pending', 'paid', 'pending_payment', 'confirmed', 'in_progress')
      AND b.court_id IS NOT NULL
      AND b.cancelled_at IS NULL
      -- Só inclui o próximo slot se a duração for > 1h (end_time > start_time + 1h)
      AND (b.end_time AT TIME ZONE 'America/Sao_Paulo') > (b.start_time AT TIME ZONE 'America/Sao_Paulo') + interval '1 hour'
  ),
  recurring_occ AS (
    SELECT r.court_id, r.start_time::time AS slot_time
    FROM public.recurring_slots r
    JOIN t ON t.tenant_id = r.tenant_id
    WHERE r.active = true
      AND r.day_of_week = EXTRACT(DOW FROM p_date)::int
      AND r.court_id IS NOT NULL
  )
  SELECT * FROM booking_occ
  UNION
  SELECT * FROM recurring_occ;
$$;

COMMENT ON FUNCTION public.fn_public_get_occupied_slots(text, date) IS 
'Retorna todos os slots ocupados considerando a duração das reservas. Se uma reserva vai das 7h às 8h30, retorna tanto 7h quanto 8h como ocupados.';

-- ============================================================================
-- GRANT: Permitir acesso público (anon) e autenticado
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon, authenticated;

COMMIT;
