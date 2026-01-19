-- Adiciona coluna de endereço na tabela tenants
-- Esta coluna será usada para mostrar a localização no calendário público

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.tenants.address IS 'Endereço completo da arena (exibido no calendário público)';
