-- ============================================================================
-- Migration: Adicionar campo half_hour_price na tabela courts
-- Data: 2026-01-21
-- Descrição: Adiciona campo para preço da meia hora adicional (1h30)
-- ============================================================================

BEGIN;

-- Adiciona coluna half_hour_price (preço da meia hora adicional)
ALTER TABLE public.courts
  ADD COLUMN IF NOT EXISTS half_hour_price numeric(10,2) DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.courts.half_hour_price IS 
'Preço da meia hora adicional quando o cliente escolhe 1h30 de jogo. O preço total será base_price + half_hour_price.';

COMMIT;
