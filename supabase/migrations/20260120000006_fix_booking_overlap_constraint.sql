-- ============================================================================
-- Migration: Corrigir constraint de overlap para incluir pending_payment
-- Data: 2026-01-20
-- Descrição: Atualiza constraint para bloquear duplicatas incluindo pending_payment
-- ============================================================================

BEGIN;

-- 1. Remove constraint antiga
ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_no_overlap_active;

-- 2. Recria constraint incluindo pending_payment e outros status ativos
DO $$
BEGIN
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_no_overlap_active
    EXCLUDE USING gist (
      tenant_id WITH =,
      court_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    )
    WHERE (
      tenant_id IS NOT NULL 
      AND court_id IS NOT NULL 
      AND COALESCE(status, 'pending') IN (
        'pending',
        'paid',
        'pending_payment',
        'confirmed',
        'in_progress'
      )
      AND cancelled_at IS NULL
    );
EXCEPTION 
  WHEN duplicate_object THEN 
    RAISE NOTICE 'Constraint já existe';
END $$;

COMMENT ON CONSTRAINT bookings_no_overlap_active ON public.bookings IS 
'Impede reservas duplicadas no mesmo horário/quadra para status ativos (pending, paid, pending_payment, confirmed, in_progress)';

COMMIT;
