-- 🐛 DIAGNÓSTICO: Quadras Duplicadas
-- Execute este SQL no Supabase Dashboard → SQL Editor

-- 1. Ver TODAS as quadras do seu tenant
SELECT 
  c.id,
  c.name,
  c.base_price,
  c.active,
  c.created_at,
  c.updated_at,
  t.business_name as arena
FROM courts c
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid() -- Seu user ID
ORDER BY c.created_at DESC;

-- 2. Contar quadras por tenant (detectar duplicatas)
SELECT 
  t.business_name,
  t.id as tenant_id,
  COUNT(c.id) as total_quadras,
  COUNT(DISTINCT c.name) as nomes_unicos
FROM tenants t
LEFT JOIN courts c ON c.tenant_id = t.id AND c.active = true
WHERE t.owner_id = auth.uid()
GROUP BY t.id, t.business_name;

-- 3. Ver se há quadras com mesmo nome (duplicatas)
SELECT 
  c.name,
  COUNT(*) as duplicatas,
  array_agg(c.id) as ids_duplicados,
  array_agg(c.base_price) as precos,
  array_agg(c.created_at ORDER BY c.created_at) as datas_criacao
FROM courts c
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid()
  AND c.active = true
GROUP BY c.name
HAVING COUNT(*) > 1;

-- 4. Ver histórico de criação de quadras (últimas 24h)
SELECT 
  c.id,
  c.name,
  c.base_price,
  c.created_at,
  c.updated_at,
  EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) as segundos_ate_update
FROM courts c
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid()
  AND c.created_at > NOW() - INTERVAL '24 hours'
ORDER BY c.created_at DESC;

-- 5. Ver se há múltiplos tenants para o mesmo usuário (causa provável)
SELECT 
  id,
  business_name,
  subdomain,
  created_at,
  email
FROM tenants
WHERE owner_id = auth.uid()
ORDER BY created_at DESC;
