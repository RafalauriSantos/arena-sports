-- Add onboarding_completed_at field to profiles
--
-- Objetivo: Marcar quando usuário completou onboarding/welcome
-- Para evitar mostrar welcome toda vez que faz login
--
-- Fluxo correto:
-- 1. Usuário faz SIGNUP → vai para /welcome (primeira vez)
-- 2. Usuário vê welcome → marca onboarding_completed_at → vai para dashboard
-- 3. Próximos logins → vai direto para dashboard (não mostra welcome)

begin;

-- Adicionar coluna onboarding_completed_at na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL;

-- Criar índice para queries rápidas
CREATE INDEX IF NOT EXISTS profiles_onboarding_completed_at_idx 
ON public.profiles(onboarding_completed_at) 
WHERE onboarding_completed_at IS NOT NULL;

-- Atualizar usuários antigos que já têm tenant_id como "onboarded" (não mostrar welcome)
-- Isso evita mostrar welcome para usuários que já usam o sistema
UPDATE public.profiles
SET onboarding_completed_at = created_at
WHERE tenant_id IS NOT NULL
  AND onboarding_completed_at IS NULL;

commit;
