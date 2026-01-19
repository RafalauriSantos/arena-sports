-- ============================================
-- Script Rápido: Configurar Horários Domingo
-- ============================================

-- 🎯 PASSO 1: Ver os tenants disponíveis
SELECT 
  id, 
  business_name, 
  subdomain,
  settings->'booking'->>'sunday_hours' as horario_domingo_atual
FROM tenants
WHERE subdomain NOT LIKE 'test-%'
ORDER BY created_at DESC;

-- 🎯 PASSO 2: Configurar domingo das 7h às 13h
-- Substitua 'SEU_SUBDOMAIN' pelo subdomain da sua arena

UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{booking}',
  jsonb_build_object(
    'sunday_hours', jsonb_build_object('start', 7, 'end', 13),
    'weekday_hours', jsonb_build_object('start', 7, 'end', 23)
  ),
  true
)
WHERE subdomain = 'SEU_SUBDOMAIN';

-- 🎯 EXEMPLO REAL: Arena Girls (ajuste conforme seu subdomain)
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{booking}',
  jsonb_build_object(
    'sunday_hours', jsonb_build_object('start', 7, 'end', 13),
    'weekday_hours', jsonb_build_object('start', 7, 'end', 23)
  ),
  true
)
WHERE subdomain = 'arenagirls-4b8a';

-- 🎯 PASSO 3: Verificar se funcionou
SELECT 
  business_name,
  subdomain,
  settings->'booking' as configuracao_booking
FROM tenants
WHERE subdomain = 'SEU_SUBDOMAIN';

-- 🎯 PASSO 4: Testar!
-- Acesse: http://localhost:5173/agendar/SEU_SUBDOMAIN
-- Selecione um domingo → Deve mostrar horários 7h-13h
-- Selecione outro dia → Deve mostrar horários 7h-23h
