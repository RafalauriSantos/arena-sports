-- Migration: Metadados de trial padronizado em 7 dias
-- Data: 2026-01-19
-- Descrição: Adiciona campos para rastrear trial e extensões manuais

-- Adiciona coluna para rastrear grupo do trial
ALTER TABLE public.tenant_subscriptions
ADD COLUMN IF NOT EXISTS trial_variant TEXT DEFAULT 'test_7d'
CHECK (trial_variant IN ('test_7d', 'legacy'));

COMMENT ON COLUMN public.tenant_subscriptions.trial_variant IS 
'Grupo do trial: test_7d (7 dias), legacy (antes da padronização)';

-- Adiciona colunas para rastrear extensões manuais do trial
ALTER TABLE public.tenant_subscriptions
ADD COLUMN IF NOT EXISTS trial_extended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_extension_days INTEGER DEFAULT 0;

COMMENT ON COLUMN public.tenant_subscriptions.trial_extended_at IS 
'Data da última extensão manual do trial (suporte)';

COMMENT ON COLUMN public.tenant_subscriptions.trial_extension_days IS 
'Total de dias extras concedidos via suporte (máximo 7)';

-- Índice para performance em queries de analytics
CREATE INDEX IF NOT EXISTS idx_trial_variant 
ON public.tenant_subscriptions (trial_variant)
WHERE status = 'trial';

-- Índice para buscar trials que precisam de extensão
CREATE INDEX IF NOT EXISTS idx_trial_extension 
ON public.tenant_subscriptions (trial_extended_at)
WHERE status = 'trial' AND trial_extended_at IS NOT NULL;

-- Atualiza trials existentes como 'legacy' (antes do teste)
UPDATE public.tenant_subscriptions
SET trial_variant = 'legacy'
WHERE trial_variant IS NULL;

-- View para analytics do trial
CREATE OR REPLACE VIEW public.trial_ab_analytics AS
SELECT
  trial_variant,
  COUNT(*) as total_trials,
  COUNT(*) FILTER (WHERE status = 'active') as converted,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'active')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as conversion_rate_percent,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (updated_at - trial_started_at)) / 86400
    )::NUMERIC,
    1
  ) as avg_days_to_convert,
  COUNT(*) FILTER (WHERE trial_extended_at IS NOT NULL) as trials_extended,
  ROUND(
    AVG(trial_extension_days)::NUMERIC,
    1
  ) as avg_extension_days
FROM public.tenant_subscriptions
WHERE trial_started_at >= NOW() - INTERVAL '90 days'
  AND trial_variant IN ('test_7d')
GROUP BY trial_variant;

COMMENT ON VIEW public.trial_ab_analytics IS 
'Métricas do trial: conversão, tempo médio e extensões';
