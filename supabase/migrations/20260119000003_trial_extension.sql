-- Migration: Extensão Manual de Trial
-- Data: 2026-01-19
-- Descrição: Função para suporte estender trial manualmente (máximo 7 dias extras)

-- Função para estender trial manualmente (via suporte)
CREATE OR REPLACE FUNCTION public.extend_trial(
  p_tenant_id UUID,
  p_extension_days INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_end TIMESTAMP WITH TIME ZONE;
  v_total_extended INTEGER;
  v_max_extension INTEGER := 7; -- Máximo 7 dias extras total
  v_subscription_id UUID;
BEGIN
  -- Busca trial atual
  SELECT 
    id,
    trial_ends_at, 
    COALESCE(trial_extension_days, 0)
  INTO 
    v_subscription_id,
    v_current_end, 
    v_total_extended
  FROM public.tenant_subscriptions
  WHERE tenant_id = p_tenant_id
    AND status = 'trial'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Valida se encontrou trial
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trial não encontrado ou não está ativo'
    );
  END IF;

  -- Valida se pode estender
  IF v_total_extended + p_extension_days > v_max_extension THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Máximo de %s dias de extensão já atingido (usado: %s dias)', 
                      v_max_extension, v_total_extended),
      'max_extension', v_max_extension,
      'already_extended', v_total_extended
    );
  END IF;

  -- Valida dias positivos
  IF p_extension_days <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Extensão deve ser maior que 0 dias'
    );
  END IF;

  -- Estende trial
  UPDATE public.tenant_subscriptions
  SET 
    trial_ends_at = v_current_end + (p_extension_days || ' days')::INTERVAL,
    trial_extended_at = NOW(),
    trial_extension_days = v_total_extended + p_extension_days,
    updated_at = NOW()
  WHERE id = v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Trial estendido por %s dias', p_extension_days),
    'old_end_date', v_current_end,
    'new_end_date', v_current_end + (p_extension_days || ' days')::INTERVAL,
    'total_extended_days', v_total_extended + p_extension_days,
    'remaining_extensions', v_max_extension - (v_total_extended + p_extension_days)
  );
END;
$$;

COMMENT ON FUNCTION public.extend_trial IS 
'Estende trial manualmente via suporte. 
Parâmetros: 
  - p_tenant_id: ID do tenant
  - p_extension_days: Dias a adicionar (padrão 3, máximo 7 total)
Retorna: JSON com sucesso/erro e detalhes';

-- Permissões: Apenas service_role (admin) pode executar
REVOKE ALL ON FUNCTION public.extend_trial FROM PUBLIC;
REVOKE ALL ON FUNCTION public.extend_trial FROM authenticated;
REVOKE ALL ON FUNCTION public.extend_trial FROM anon;
GRANT EXECUTE ON FUNCTION public.extend_trial TO service_role;

-- Função helper: Verificar se trial pode ser estendido (query rápida)
CREATE OR REPLACE FUNCTION public.can_extend_trial(
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(trial_extension_days, 0) < 7
  FROM public.tenant_subscriptions
  WHERE tenant_id = p_tenant_id
    AND status = 'trial'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.can_extend_trial IS 
'Verifica se trial do tenant pode receber extensão (< 7 dias extras usados)';

-- Permissões para a função helper (authenticated pode ler)
GRANT EXECUTE ON FUNCTION public.can_extend_trial TO authenticated;

-- Exemplo de uso (comentado)
/*
-- Estender trial em 3 dias (padrão)
SELECT public.extend_trial('tenant-uuid-here');

-- Estender trial em 5 dias
SELECT public.extend_trial('tenant-uuid-here', 5);

-- Verificar se pode estender
SELECT public.can_extend_trial('tenant-uuid-here');

-- Ver status de todos os trials
SELECT 
  t.business_name,
  ts.trial_variant,
  ts.trial_ends_at,
  ts.trial_extension_days,
  ts.status
FROM tenant_subscriptions ts
JOIN tenants t ON t.id = ts.tenant_id
WHERE ts.status = 'trial'
ORDER BY ts.trial_ends_at;
*/
