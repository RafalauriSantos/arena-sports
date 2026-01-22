-- Migration: Permitir que usuários autenticados também executem funções públicas
-- Data: 2026-01-21
-- Descrição: Garantir que authenticated também pode executar fn_public_get_occupied_slots

begin;

-- Garantir que authenticated também pode executar a função pública de horários ocupados
grant execute on function public.fn_public_get_occupied_slots(text, date) to authenticated;

commit;
