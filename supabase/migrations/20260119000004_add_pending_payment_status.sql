-- Migration: Adiciona suporte para status "pending_payment" (pagar no balcão)
-- Data: 2026-01-19

BEGIN;

-- 1. Verifica se a constraint de status existe e remove (para recriar com novo valor)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_status_check'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
    RAISE NOTICE 'Constraint bookings_status_check removida';
  END IF;
END $$;

-- 2. Normaliza status existentes (se houver valores inválidos, padroniza para 'confirmed')
UPDATE public.bookings
SET status = 'confirmed'
WHERE status NOT IN ('confirmed', 'cancelled', 'pending_payment', 'completed')
   OR status IS NULL;

-- 3. Adiciona nova constraint com "pending_payment"
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('confirmed', 'cancelled', 'pending_payment', 'completed'));

COMMENT ON CONSTRAINT bookings_status_check ON public.bookings IS 
'Status possíveis: confirmed (pago), pending_payment (aguardando pagamento no balcão), cancelled, completed';

COMMIT;
