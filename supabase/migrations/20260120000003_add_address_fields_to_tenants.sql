-- ============================================================================
-- Migration: Adicionar campos de endereço detalhados à tabela tenants
-- Data: 2026-01-20
-- Descrição: CEP, Rua, Número, Bairro, Cidade, Estado para busca automática
-- ============================================================================

BEGIN;

-- 1. Adiciona colunas de endereço detalhadas
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

-- 2. Comentários explicativos
COMMENT ON COLUMN public.tenants.cep IS 'CEP do endereço (apenas números)';
COMMENT ON COLUMN public.tenants.street IS 'Rua/Avenida';
COMMENT ON COLUMN public.tenants.number IS 'Número do endereço';
COMMENT ON COLUMN public.tenants.complement IS 'Complemento (apto, sala, etc)';
COMMENT ON COLUMN public.tenants.neighborhood IS 'Bairro';
COMMENT ON COLUMN public.tenants.city IS 'Cidade';
COMMENT ON COLUMN public.tenants.state IS 'Estado (UF)';

-- 3. Índice para busca por CEP
CREATE INDEX IF NOT EXISTS idx_tenants_cep 
  ON public.tenants(cep) 
  WHERE cep IS NOT NULL;

-- 4. Índice para busca por cidade
CREATE INDEX IF NOT EXISTS idx_tenants_city 
  ON public.tenants(city) 
  WHERE city IS NOT NULL;

-- 5. Validação de CEP (8 dígitos)
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS check_cep_format;

ALTER TABLE public.tenants
  ADD CONSTRAINT check_cep_format CHECK (
    cep IS NULL 
    OR cep ~ '^[0-9]{8}$'
  );

-- 6. Validação de UF (2 letras maiúsculas)
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS check_state_format;

ALTER TABLE public.tenants
  ADD CONSTRAINT check_state_format CHECK (
    state IS NULL 
    OR state ~ '^[A-Z]{2}$'
  );

-- 7. Função para formatar endereço completo
CREATE OR REPLACE FUNCTION public.fn_format_full_address(
  p_street TEXT,
  p_number TEXT,
  p_complement TEXT,
  p_neighborhood TEXT,
  p_city TEXT,
  p_state TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN TRIM(
    COALESCE(p_street, '') || 
    CASE WHEN p_number IS NOT NULL THEN ', ' || p_number ELSE '' END ||
    CASE WHEN p_complement IS NOT NULL THEN ' - ' || p_complement ELSE '' END ||
    CASE WHEN p_neighborhood IS NOT NULL THEN ' - ' || p_neighborhood ELSE '' END ||
    CASE WHEN p_city IS NOT NULL THEN ', ' || p_city ELSE '' END ||
    CASE WHEN p_state IS NOT NULL THEN '/' || p_state ELSE '' END
  );
END;
$$;

-- 8. View para endereços formatados
CREATE OR REPLACE VIEW public.v_tenants_with_address AS
SELECT 
  t.*,
  fn_format_full_address(
    t.street,
    t.number,
    t.complement,
    t.neighborhood,
    t.city,
    t.state
  ) as full_address
FROM public.tenants t;

-- 9. Grants
GRANT SELECT ON public.v_tenants_with_address TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.fn_format_full_address(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon;

COMMIT;
