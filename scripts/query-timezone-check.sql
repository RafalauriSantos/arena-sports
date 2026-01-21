-- ============================================================================
-- Consulta: Verificar Timezone das Reservas
-- Seguro: APENAS SELECT - Nenhum comando destrutivo
-- ============================================================================

SELECT 
  customer_name,
  start_time,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS hora_brasil,
  EXTRACT(HOUR FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) AS hora,
  EXTRACT(MINUTE FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) AS minuto,
  status
FROM bookings
WHERE DATE(start_time) >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 20;
