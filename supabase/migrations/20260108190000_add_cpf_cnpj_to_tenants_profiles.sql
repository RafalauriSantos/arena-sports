-- Adicionar campos CPF/CNPJ para dados de faturamento do Asaas
-- Esses campos serão usados para criar o Customer no Asaas
--
-- IMPORTANTE: Esses campos são opcionais, mas quando o usuário for fazer checkout,
-- o CPF/CNPJ será obrigatório. O frontend deve coletar esses dados antes de chamar
-- a Edge Function asaas-create-checkout.

BEGIN;

-- Adicionar cpf_cnpj na tabela tenants (empresa/arena)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Adicionar cpf_cnpj na tabela profiles (usuário/pessoa física)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Índices para busca (opcional, mas ajuda em queries futuras)
CREATE INDEX IF NOT EXISTS tenants_cpf_cnpj_idx ON public.tenants (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_cpf_cnpj_idx ON public.profiles (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.tenants.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) da empresa/arena. Usado para faturamento no Asaas. Obrigatório para criar assinatura.';
COMMENT ON COLUMN public.profiles.cpf_cnpj IS 'CPF (11 dígitos) ou CNPJ (14 dígitos) da pessoa física. Usado para faturamento no Asaas. Obrigatório para criar assinatura.';

COMMIT;
