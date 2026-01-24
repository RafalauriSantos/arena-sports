-- Script para verificar políticas RLS de bookings
-- Execute no SQL Editor do Supabase

-- 1. Ver todas as políticas de bookings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'bookings'
ORDER BY policyname;

-- 2. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'bookings';

-- 3. Testar função fn_is_public_tenant
-- Substitua <TENANT_ID> pelo ID real do tenant "capital da bola"
SELECT public.fn_is_public_tenant('<TENANT_ID>'::uuid) as is_public;

-- 4. Verificar tenant "capital da bola"
SELECT id, business_name, subdomain 
FROM public.tenants 
WHERE subdomain = 'capital-da-bola' 
   OR subdomain ILIKE '%capital%bola%'
LIMIT 5;

-- 5. Verificar quadras do tenant
-- Substitua <TENANT_ID> pelo ID real
SELECT id, name, active, tenant_id
FROM public.courts
WHERE tenant_id = '<TENANT_ID>'::uuid
  AND active = true;
