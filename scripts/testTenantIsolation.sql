-- Script de Teste: Isolamento entre Tenants (RLS)
--
-- Objetivo: Validar que RLS está funcionando corretamente
-- e que tenants não conseguem ver/modificar dados um do outro
--
-- Como usar:
-- 1. Execute este script no Supabase Dashboard > SQL Editor
-- 2. Substitua <TENANT_A_OWNER_ID> e <TENANT_B_OWNER_ID> pelos IDs reais
-- 3. Verifique se os resultados confirmam isolamento
--
-- IMPORTANTE: Este script usa service_role para simular múltiplos usuários.
-- Em produção, cada tenant fará login com seu próprio usuário.

begin;

-- =========================
-- 1. SETUP: Criar dados de teste
-- =========================
-- (Execute manualmente se necessário, ou use os dados existentes)

-- Exemplo de verificação (substitua pelos IDs reais dos seus tenants de teste):
-- SELECT id, owner_id, business_name, subdomain FROM public.tenants LIMIT 2;

-- =========================
-- 2. TESTE: Verificar se RLS está habilitado
-- =========================

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('courts', 'bookings', 'promotion_rules', 'tenant_subscriptions', 'booking_events')
order by tablename;

-- Resultado esperado: rls_enabled = true para todas as tabelas listadas

-- =========================
-- 3. TESTE: Verificar Policies existentes
-- =========================

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('courts', 'bookings', 'promotion_rules', 'tenant_subscriptions', 'booking_events')
order by tablename, policyname;

-- Resultado esperado: Cada tabela deve ter pelo menos uma policy de owner/service_role

-- =========================
-- 4. TESTE: Validar isolamento entre tenants
-- =========================
-- Este teste verifica que um tenant não consegue ver dados do outro

-- Substitua <TENANT_A_ID> e <TENANT_B_ID> pelos IDs reais dos seus tenants de teste
-- Exemplo: SELECT id FROM public.tenants LIMIT 2;

-- Teste 1: Verificar que cada tenant só vê suas próprias quadras
-- (Execute como tenant A - deve retornar apenas quadras do tenant A)
/*
SELECT
  'Courts do Tenant A' as test_name,
  COUNT(*) as total_courts,
  COUNT(DISTINCT tenant_id) as unique_tenants
FROM public.courts
WHERE tenant_id = '<TENANT_A_ID>';
*/

-- Teste 2: Verificar que cada tenant só vê suas próprias reservas
-- (Execute como tenant A - deve retornar apenas reservas do tenant A)
/*
SELECT
  'Bookings do Tenant A' as test_name,
  COUNT(*) as total_bookings,
  COUNT(DISTINCT tenant_id) as unique_tenants
FROM public.bookings
WHERE tenant_id = '<TENANT_A_ID>';
*/

-- =========================
-- 5. TESTE MANUAL: Simular acesso de diferentes tenants
-- =========================
-- Para testar completamente, você precisa:
--
-- 1. Criar 2 usuários de teste no Supabase Auth
-- 2. Criar 2 tenants (um para cada usuário)
-- 3. Criar dados em cada tenant (courts, bookings)
-- 4. Fazer login com cada usuário e verificar que:
--    - Usuário A vê apenas dados do Tenant A
--    - Usuário B vê apenas dados do Tenant B
--    - Nenhum vê dados do outro
--
-- Script para criar dados de teste (execute com service_role):
/*
-- Criar Tenant A
INSERT INTO public.tenants (owner_id, business_name, subdomain)
VALUES ('<USER_A_ID>', 'Arena Teste A', 'teste-a')
RETURNING id as tenant_a_id;

-- Criar Tenant B
INSERT INTO public.tenants (owner_id, business_name, subdomain)
VALUES ('<USER_B_ID>', 'Arena Teste B', 'teste-b')
RETURNING id as tenant_b_id;

-- Criar quadras para Tenant A
INSERT INTO public.courts (tenant_id, name, sport)
VALUES
  ('<TENANT_A_ID>', 'Quadra 1', 'Futebol'),
  ('<TENANT_A_ID>', 'Quadra 2', 'Futebol');

-- Criar quadras para Tenant B
INSERT INTO public.courts (tenant_id, name, sport)
VALUES
  ('<TENANT_B_ID>', 'Quadra 1', 'Futebol'),
  ('<TENANT_B_ID>', 'Quadra 2', 'Futebol');

-- Criar reservas para Tenant A
INSERT INTO public.bookings (tenant_id, court_id, customer_name, start_time, end_time)
SELECT
  '<TENANT_A_ID>'::uuid,
  id,
  'Cliente Teste A',
  now() + interval '1 day',
  now() + interval '1 day 1 hour'
FROM public.courts
WHERE tenant_id = '<TENANT_A_ID>'::uuid
LIMIT 1;

-- Criar reservas para Tenant B
INSERT INTO public.bookings (tenant_id, court_id, customer_name, start_time, end_time)
SELECT
  '<TENANT_B_ID>'::uuid,
  id,
  'Cliente Teste B',
  now() + interval '1 day',
  now() + interval '1 day 1 hour'
FROM public.courts
WHERE tenant_id = '<TENANT_B_ID>'::uuid
LIMIT 1;
*/

-- =========================
-- 6. VERIFICAÇÃO FINAL: Query que deve falhar com RLS
-- =========================
-- Esta query deve retornar erro "permission denied" se RLS estiver funcionando:
--
-- Execute como Tenant A tentando acessar dados do Tenant B:
-- (Deve retornar 0 resultados ou erro de permissão)
/*
SELECT *
FROM public.bookings
WHERE tenant_id = '<TENANT_B_ID>';
-- Resultado esperado: 0 linhas (RLS bloqueia acesso)
*/

-- =========================
-- 7. CHECKLIST DE VALIDAÇÃO
-- =========================
-- Marque cada item conforme você valida:
--
-- [ ] RLS habilitado em todas tabelas críticas (courts, bookings, promotion_rules)
-- [ ] Policies criadas para owner-only + service_role
-- [ ] Teste manual: Tenant A não vê dados do Tenant B
-- [ ] Teste manual: Tenant B não vê dados do Tenant A
-- [ ] Página pública (/agendar/:subdomain) continua funcionando (RLS público ok)
-- [ ] Admin dashboard carrega dados do próprio tenant (sem erros de permissão)
-- [ ] Criar reserva funciona (INSERT passa pela policy)
-- [ ] Editar reserva funciona (UPDATE passa pela policy)
-- [ ] Deletar reserva funciona (DELETE passa pela policy)

commit;

-- =========================
-- COMANDOS ÚTEIS PARA DEBUG
-- =========================

-- Ver todas as tabelas com RLS habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Ver todas as policies de uma tabela:
-- SELECT * FROM pg_policies WHERE tablename = 'bookings';

-- Desabilitar RLS temporariamente para debug (NÃO FAÇA ISSO EM PRODUÇÃO):
-- ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS:
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
