-- ============================================================================
-- Consulta: Verificar Replication (Real-time)
-- Seguro: APENAS SELECT - Nenhum comando destrutivo
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  'Na publicacao supabase_realtime' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('bookings', 'courts', 'tenants')
ORDER BY tablename;
