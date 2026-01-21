-- ============================================================================
-- Migration: Adicionar campos de contato e configurações à tabela tenants
-- Data: 2026-01-20
-- Descrição: Adiciona phone, email, description e settings para armazenar
--            informações de contato do admin/dono da arena
-- ============================================================================

BEGIN;

-- 1. Adiciona colunas de contato (só se não existirem)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 2. Adiciona comentários explicativos
COMMENT ON COLUMN public.tenants.phone IS 'Telefone/WhatsApp do dono da arena (usado para notificações e exibição no calendário público)';
COMMENT ON COLUMN public.tenants.email IS 'E-mail de contato da arena (pode ser diferente do e-mail do usuário)';
COMMENT ON COLUMN public.tenants.description IS 'Descrição/bio da arena (exibida no calendário público)';
COMMENT ON COLUMN public.tenants.settings IS 'Configurações personalizadas em JSON (booking rules, horários, etc)';

-- 3. Cria índice para buscas rápidas por telefone
CREATE INDEX IF NOT EXISTS idx_tenants_phone 
  ON public.tenants(phone) 
  WHERE phone IS NOT NULL;

-- 4. Cria índice para buscas rápidas por email
CREATE INDEX IF NOT EXISTS idx_tenants_email 
  ON public.tenants(email) 
  WHERE email IS NOT NULL;

-- 5. Adiciona validação básica de telefone (apenas dígitos, 10-13 caracteres)
-- Remove constraint antiga se existir
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS check_phone_format;

-- Adiciona constraint nova
ALTER TABLE public.tenants
  ADD CONSTRAINT check_phone_format CHECK (
    phone IS NULL 
    OR (
      phone ~ '^[0-9]{10,13}$'  -- Apenas números, 10 a 13 dígitos
    )
  );

-- 6. Adiciona validação básica de email
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS check_email_format;

ALTER TABLE public.tenants
  ADD CONSTRAINT check_email_format CHECK (
    email IS NULL 
    OR (
      email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
  );

COMMIT;
