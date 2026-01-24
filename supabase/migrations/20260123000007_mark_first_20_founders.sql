-- Migration: Marcar os primeiros 20 usuários como Founders
-- Data: 2026-01-23
-- Problema: Usuários existentes não estão marcados como founders mesmo sendo dos primeiros 20

BEGIN;

-- Marcar os primeiros 20 tenants como founders (baseado na ordem de criação)
-- Considera apenas tenants com subscription ativa, em trial ou past_due

WITH ranked_tenants AS (
    SELECT 
        ts.tenant_id,
        t.created_at,
        ROW_NUMBER() OVER (ORDER BY t.created_at ASC) as rank
    FROM tenant_subscriptions ts
    INNER JOIN tenants t ON t.id = ts.tenant_id
    WHERE ts.is_founder = FALSE
      AND ts.status IN ('active', 'trial', 'past_due')
    ORDER BY t.created_at ASC
    LIMIT 20
),
existing_founders AS (
    SELECT COUNT(*)::integer as count
    FROM tenant_subscriptions
    WHERE is_founder = TRUE
      AND status IN ('active', 'trial', 'past_due')
)
UPDATE tenant_subscriptions ts
SET 
    is_founder = TRUE,
    updated_at = NOW()
FROM ranked_tenants rt, existing_founders ef
WHERE ts.tenant_id = rt.tenant_id
  AND ts.is_founder = FALSE
  AND ef.count + rt.rank <= 20;

COMMIT;

-- ==============================================================================
-- VERIFICAÇÃO (opcional - executar manualmente se necessário)
-- ==============================================================================
-- Verificar founders:
-- SELECT 
--     ts.tenant_id,
--     t.business_name,
--     p.email,
--     ts.status,
--     ts.is_founder,
--     t.created_at
-- FROM tenant_subscriptions ts
-- INNER JOIN tenants t ON t.id = ts.tenant_id
-- LEFT JOIN profiles p ON p.tenant_id = ts.tenant_id
-- WHERE ts.is_founder = TRUE
-- ORDER BY t.created_at ASC;
