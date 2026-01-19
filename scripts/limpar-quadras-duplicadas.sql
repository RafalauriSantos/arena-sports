-- 🧹 LIMPEZA: Remover Quadras Duplicadas
-- Execute este SQL no Supabase Dashboard → SQL Editor

-- ATENÇÃO: Este script vai desativar quadras duplicadas, mantendo apenas a mais recente de cada nome

-- 1. BACKUP: Ver quantas quadras serão afetadas (RODE ISSO PRIMEIRO)
SELECT 
  c.name,
  COUNT(*) as total,
  array_agg(c.id ORDER BY c.created_at DESC) as ids,
  array_agg(c.base_price ORDER BY c.created_at DESC) as precos,
  array_agg(c.created_at ORDER BY c.created_at DESC) as datas
FROM courts c
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid()
  AND c.active = true
GROUP BY c.name
HAVING COUNT(*) > 1;

-- 2. LIMPEZA: Desativa duplicatas (mantém apenas a mais recente de cada nome)
-- ⚠️ RODE ISSO APENAS SE O PASSO 1 MOSTROU DUPLICATAS
WITH ranked_courts AS (
  SELECT 
    c.id,
    c.name,
    ROW_NUMBER() OVER (
      PARTITION BY c.tenant_id, c.name 
      ORDER BY c.created_at DESC, c.updated_at DESC
    ) as row_num
  FROM courts c
  JOIN tenants t ON t.id = c.tenant_id
  WHERE t.owner_id = auth.uid()
    AND c.active = true
)
UPDATE courts
SET active = false
WHERE id IN (
  SELECT id 
  FROM ranked_courts 
  WHERE row_num > 1
);

-- 3. VERIFICAÇÃO: Ver quadras ativas restantes (deve mostrar apenas 3)
SELECT 
  c.id,
  c.name,
  c.base_price,
  c.created_at,
  t.business_name
FROM courts c
JOIN tenants t ON t.id = c.tenant_id
WHERE t.owner_id = auth.uid()
  AND c.active = true
ORDER BY c.name, c.created_at DESC;

-- 4. OPCIONAL: Se quiser DELETAR permanentemente (não recomendado)
-- DELETE FROM courts
-- WHERE id IN (
--   SELECT id 
--   FROM ranked_courts 
--   WHERE row_num > 1
-- );
