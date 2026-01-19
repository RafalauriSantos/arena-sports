-- =====================================================
-- Migration: Adiciona coluna CPF/CNPJ na tabela tenants
-- Data: 2026-01-18
-- Descrição: Campo para CPF ou CNPJ do responsável
-- Segura: Idempotente (pode rodar múltiplas vezes)
-- =====================================================

-- 1. Adiciona a coluna cpf_cnpj (só se não existir)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- 2. Adiciona comentário explicativo
COMMENT ON COLUMN public.tenants.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) do responsável. Armazenado SEM formatação (apenas números).';

-- 3. Cria índice para buscas rápidas (só se não existir)
CREATE INDEX IF NOT EXISTS idx_tenants_cpf_cnpj ON public.tenants (cpf_cnpj)
WHERE
    cpf_cnpj IS NOT NULL;

-- 4. Adiciona constraint para validar tamanho (CPF = 11 ou CNPJ = 14 dígitos)
-- Remove constraint antiga se existir
ALTER TABLE public.tenants
DROP CONSTRAINT IF EXISTS check_cpf_cnpj_length;

-- Adiciona constraint nova
ALTER TABLE public.tenants
ADD CONSTRAINT check_cpf_cnpj_length CHECK (
    cpf_cnpj IS NULL
    OR (
        cpf_cnpj ~ '^[0-9]+$'
        AND LENGTH(cpf_cnpj) IN (11, 14)
    )
);

-- 5. Adiciona constraint para evitar CPF/CNPJ inválidos (todos iguais)
-- Remove constraint antiga se existir
ALTER TABLE public.tenants
DROP CONSTRAINT IF EXISTS check_cpf_cnpj_not_same_digits;

-- Adiciona constraint nova
ALTER TABLE public.tenants
ADD CONSTRAINT check_cpf_cnpj_not_same_digits CHECK (
    cpf_cnpj IS NULL
    OR cpf_cnpj NOT IN(
        '00000000000',
        '11111111111',
        '22222222222',
        '33333333333',
        '44444444444',
        '55555555555',
        '66666666666',
        '77777777777',
        '88888888888',
        '99999999999',
        '00000000000000',
        '11111111111111',
        '22222222222222',
        '33333333333333',
        '44444444444444',
        '55555555555555',
        '66666666666666',
        '77777777777777',
        '88888888888888',
        '99999999999999'
    )
);

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Log de sucesso
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration concluída: cpf_cnpj adicionado com sucesso!';
END $$;