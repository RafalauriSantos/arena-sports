-- ==============================================================================
-- CORRIGIR POLÍTICA DE INSERT PARA ANON
-- ==============================================================================
-- A política atual pode estar falhando porque fn_is_tenant_owner retorna false
-- para anon, mas isso não deveria impedir a segunda parte do OR de funcionar.
-- Vamos simplificar: para anon, só permite reservas públicas.
-- Para authenticated, permite se for dono OU reserva pública.
-- ==============================================================================

begin;

-- Remover política de INSERT atual
drop policy if exists bookings_insert on public.bookings;

-- Criar política de INSERT separada por tipo de usuário
-- IMPORTANTE: Para anon, APENAS reservas públicas são permitidas
-- Para authenticated, permite se for dono OU reserva pública
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Se for usuário anônimo, APENAS permite reservas públicas
  (
    auth.uid() is null
    and status = 'pending_payment'
    and public.fn_is_public_tenant(tenant_id)
    and public.fn_is_active_court_for_tenant(court_id, tenant_id)
    and customer_name is not null
    and trim(customer_name) != ''
    and customer_phone is not null
    and trim(customer_phone) != ''
    and start_time is not null
    and end_time is not null
    and total_price is not null
    and total_price >= 0
  )
  OR
  -- Se for usuário autenticado, permite se for dono OU reserva pública
  (
    auth.uid() is not null
    and (
      -- Caso 1: É dono do tenant (permite qualquer INSERT)
      public.fn_is_tenant_owner(tenant_id)
      OR
      -- Caso 2: Reserva pública válida
      (
        status = 'pending_payment'
        and public.fn_is_public_tenant(tenant_id)
        and public.fn_is_active_court_for_tenant(court_id, tenant_id)
        and customer_name is not null
        and trim(customer_name) != ''
        and customer_phone is not null
        and trim(customer_phone) != ''
        and start_time is not null
        and end_time is not null
        and total_price is not null
        and total_price >= 0
      )
    )
  )
);

comment on policy bookings_insert on public.bookings is 'Permite INSERT: anon apenas reservas públicas; authenticated se for dono OU reserva pública';

commit;
