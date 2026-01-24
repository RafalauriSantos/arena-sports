-- Migration: Forçar trial de 7 dias em todas as subscriptions
-- Data: 2026-01-23
-- Problema: Dashboard ainda mostra dias incorretos de trial

BEGIN;

-- Corrigir trial_ends_at para EXATAMENTE 7 dias a partir de trial_started_at
-- Isso garante que mesmo subscriptions antigas terão o cálculo correto
UPDATE public.tenant_subscriptions
SET 
    trial_ends_at = trial_started_at + interval '7 days',
    grace_ends_at = trial_started_at + interval '10 days',
    updated_at = NOW()
WHERE 
    status = 'trial' 
    AND trial_started_at IS NOT NULL
    AND (
        -- Corrigir se trial_ends_at está diferente de 7 dias
        trial_ends_at IS NULL 
        OR trial_ends_at != trial_started_at + interval '7 days'
        OR trial_ends_at > trial_started_at + interval '7 days'
    );

-- Verificar e corrigir subscriptions que estão em trial mas não têm trial_started_at
-- (caso raro, mas pode acontecer)
UPDATE public.tenant_subscriptions
SET 
    trial_started_at = COALESCE(trial_started_at, created_at),
    trial_ends_at = COALESCE(trial_ends_at, created_at + interval '7 days'),
    grace_ends_at = COALESCE(grace_ends_at, created_at + interval '10 days'),
    updated_at = NOW()
WHERE 
    status = 'trial' 
    AND trial_started_at IS NULL;

COMMIT;

-- ==============================================================================
-- VERIFICAÇÃO (opcional - executar manualmente se necessário)
-- ==============================================================================
-- Verificar subscriptions em trial:
-- SELECT 
--     tenant_id,
--     status,
--     trial_started_at,
--     trial_ends_at,
--     EXTRACT(DAY FROM (trial_ends_at - trial_started_at)) as trial_duration_days,
--     CASE 
--         WHEN trial_ends_at > NOW() THEN 
--             EXTRACT(DAY FROM (trial_ends_at - NOW()))::int
--         ELSE 0
--     END as days_remaining
-- FROM public.tenant_subscriptions
-- WHERE status = 'trial'
-- ORDER BY trial_started_at DESC;
