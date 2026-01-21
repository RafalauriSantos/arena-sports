-- ============================================================================
-- Consulta: Estatísticas de Reservas (Últimos 7 dias)
-- Seguro: APENAS SELECT - Nenhum comando destrutivo
-- ============================================================================

SELECT 
  DATE(start_time AT TIME ZONE 'America/Sao_Paulo') as data,
  COUNT(*) as total_reservas,
  COUNT(*) FILTER (WHERE status = 'completed') as finalizadas,
  COUNT(*) FILTER (WHERE status = 'in_progress') as em_andamento,
  COUNT(*) FILTER (WHERE status = 'cancelled') as canceladas,
  SUM(total_price) FILTER (WHERE status = 'completed') as receita_finalizadas
FROM bookings
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(start_time AT TIME ZONE 'America/Sao_Paulo')
ORDER BY data DESC;
