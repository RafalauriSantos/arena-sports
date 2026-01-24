-- ==============================================================================
-- TESTE DAS FUNÇÕES SECURITY DEFINER
-- ==============================================================================
-- Execute este script no Supabase SQL Editor para testar as funções
-- ==============================================================================

-- 1. Buscar um tenant público
SELECT id, business_name, subdomain 
FROM public.tenants 
WHERE subdomain IS NOT NULL 
  AND trim(subdomain) != '' 
LIMIT 1;

-- 2. Testar fn_is_public_tenant (substitua o UUID pelo ID do tenant acima)
-- SELECT public.fn_is_public_tenant('SUBSTITUA_PELO_UUID_DO_TENANT');

-- 3. Buscar uma quadra ativa desse tenant
-- SELECT id, name, active, tenant_id 
-- FROM public.courts 
-- WHERE tenant_id = 'SUBSTITUA_PELO_UUID_DO_TENANT' 
--   AND active = true 
-- LIMIT 1;

-- 4. Testar fn_is_active_court_for_tenant (substitua os UUIDs)
-- SELECT public.fn_is_active_court_for_tenant(
--   'SUBSTITUA_PELO_UUID_DA_QUADRA',
--   'SUBSTITUA_PELO_UUID_DO_TENANT'
-- );

-- 5. Testar fn_is_tenant_owner (deve retornar false para anon)
-- SELECT public.fn_is_tenant_owner('SUBSTITUA_PELO_UUID_DO_TENANT');

-- 6. Verificar políticas RLS ativas na tabela bookings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 7. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'bookings';

-- 8. Verificar grants nas funções
SELECT 
  routine_schema,
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'fn_is_public_tenant',
    'fn_is_active_court_for_tenant',
    'fn_is_tenant_owner'
  );

-- 9. Verificar grants de EXECUTE nas funções
SELECT 
  p.proname AS function_name,
  r.rolname AS role_name,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON true
WHERE n.nspname = 'public'
  AND p.proname IN (
    'fn_is_public_tenant',
    'fn_is_active_court_for_tenant',
    'fn_is_tenant_owner'
  )
  AND r.rolname IN ('anon', 'authenticated')
ORDER BY p.proname, r.rolname;
