-- ============================================================================
-- Script para verificar e corrigir horários de reservas
-- ============================================================================

-- 1. Ver reservas atuais com timezone
SELECT 
  id,
  customer_name,
  start_time,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS start_time_brt,
  (start_time AT TIME ZONE 'America/Sao_Paulo')::time AS hora_local,
  status
FROM public.bookings
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 20;

-- 2. Verificar se há horários "estranhos" (fora do horário comercial quando convertido)
-- Ex: Se uma reserva foi feita para 19:00 mas está salva como 22:00 UTC
SELECT 
  id,
  customer_name,
  start_time,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS start_time_brt,
  (start_time AT TIME ZONE 'America/Sao_Paulo')::time AS hora_local
FROM public.bookings
WHERE start_time >= CURRENT_DATE
  AND EXTRACT(HOUR FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) NOT BETWEEN 6 AND 23
ORDER BY start_time;

-- 3. Se precisar CORRIGIR reservas que foram salvas com timezone errado:
-- ATENÇÃO: Execute APENAS SE TIVER CERTEZA de que os horários estão errados!
-- 
-- Exemplo: Se a reserva está salva como "2024-01-20 22:00:00+00" (22:00 UTC)
-- mas deveria ser "2024-01-20 19:00:00-03" (19:00 BRT), execute:
--
-- UPDATE public.bookings
-- SET start_time = start_time - INTERVAL '3 hours',
--     end_time = end_time - INTERVAL '3 hours'
-- WHERE start_time >= CURRENT_DATE
--   AND /* ADICIONE CONDIÇÃO ESPECÍFICA AQUI */;

-- 4. Ver timezone configurado do banco
SHOW timezone;
