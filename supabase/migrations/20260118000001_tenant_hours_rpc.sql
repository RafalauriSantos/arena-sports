/**
 * Migration: Configuração de Horários de Funcionamento por Dia da Semana
 * 
 * Permite configurar horários diferentes para:
 * - Domingo (ex: 7h-13h)
 * - Segunda a Sábado (ex: 7h-23h)
 * 
 * VERSÃO SEGURA: Busca automaticamente o tenant do usuário logado
 */

-- 1. Remove versões antigas (se existirem)
DROP FUNCTION IF EXISTS public.fn_update_tenant_hours(uuid, int, int, int, int);
DROP FUNCTION IF EXISTS public.fn_update_my_tenant_hours(int, int, int, int);

-- 2. Cria a função RPC segura (auto-consciente)
CREATE OR REPLACE FUNCTION public.fn_update_my_tenant_hours(
  p_sunday_start int,
  p_sunday_end int,
  p_weekday_start int,
  p_weekday_end int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _my_tenant_id uuid;
  _new_hours jsonb;
  _updated_settings jsonb;
BEGIN
  -- 🕵️‍♂️ Busca automaticamente o tenant do usuário logado
  SELECT id INTO _my_tenant_id
  FROM public.tenants
  WHERE owner_id = auth.uid()
  LIMIT 1;

  -- Trava de segurança: usuário sem empresa não pode alterar
  IF _my_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui uma empresa vinculada.';
  END IF;

  -- Validações (evita quebrar o calendário)
  IF p_sunday_start < 0 OR p_sunday_start > 23 OR p_sunday_end < 0 OR p_sunday_end > 23 THEN
    RAISE EXCEPTION 'Horários de domingo inválidos (0-23)';
  END IF;
  
  IF p_weekday_start < 0 OR p_weekday_start > 23 OR p_weekday_end < 0 OR p_weekday_end > 23 THEN
    RAISE EXCEPTION 'Horários de dias da semana inválidos (0-23)';
  END IF;
  
  IF p_sunday_start >= p_sunday_end THEN
    RAISE EXCEPTION 'Domingo: Hora de início deve ser menor que o fim';
  END IF;
  
  IF p_weekday_start >= p_weekday_end THEN
    RAISE EXCEPTION 'Semana: Hora de início deve ser menor que o fim';
  END IF;

  -- Monta o JSON com os horários
  _new_hours := jsonb_build_object(
    'sunday_hours', jsonb_build_object('start', p_sunday_start, 'end', p_sunday_end),
    'weekday_hours', jsonb_build_object('start', p_weekday_start, 'end', p_weekday_end)
  );

  -- Atualiza APENAS a empresa do usuário logado (merge seguro)
  UPDATE public.tenants
  SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{booking}',
      COALESCE(settings->'booking', '{}'::jsonb) || _new_hours,
      true
  ),
  updated_at = now()
  WHERE id = _my_tenant_id
  RETURNING settings INTO _updated_settings;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar tenant';
  END IF;

  RETURN _updated_settings;
END;
$$;

-- 3. Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION public.fn_update_my_tenant_hours(int, int, int, int) TO authenticated;

COMMENT ON FUNCTION public.fn_update_my_tenant_hours IS 
'Atualiza horários de funcionamento do tenant do usuário logado. Busca automaticamente via auth.uid().';
