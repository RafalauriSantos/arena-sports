-- Ver quais migrations foram aplicadas
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
