-- ==============================================================================
-- CONCEDER PERMISSÃO DE INSERT NA TABELA BOOKINGS PARA ANON
-- ==============================================================================
-- O erro mudou de RLS para "permission denied", indicando falta de GRANT
-- ==============================================================================

begin;

-- Conceder permissão de INSERT para anon e authenticated na tabela bookings
grant insert on table public.bookings to anon, authenticated;

-- Garantir que também têm SELECT (para o .select() após insert)
grant select on table public.bookings to anon, authenticated;

-- Comentário
comment on table public.bookings is 'Tabela de reservas - anon e authenticated podem inserir reservas públicas';

commit;
