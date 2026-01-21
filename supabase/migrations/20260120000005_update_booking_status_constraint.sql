-- ============================================================================
-- Migration: Atualizar constraint de status para permitir in_progress
-- Data: 2026-01-20
-- Descrição: Adiciona 'in_progress' e 'paid' aos status permitidos
-- ============================================================================

BEGIN;

-- 1. Remove constraint antiga
ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;

-- 2. Adiciona nova constraint com todos os status permitidos
ALTER TABLE public.bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN (
    'pending',           -- Reserva pendente (antigo)
    'confirmed',         -- Confirmada/Paga
    'paid',              -- Pago
    'pending_payment',   -- Aguardando pagamento no balcão
    'in_progress',       -- Jogo em andamento
    'completed',         -- Jogo finalizado
    'cancelled'          -- Cancelada
  ));

COMMENT ON CONSTRAINT bookings_status_check ON public.bookings IS 
'Status possíveis: pending, confirmed, paid, pending_payment, in_progress, completed, cancelled';

COMMIT;
