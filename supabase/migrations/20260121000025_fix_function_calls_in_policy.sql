-- ==============================================================================
-- CORRIGIR CHAMADAS DE FUNÇÕES NA POLÍTICA
-- ==============================================================================
-- Remove comparações explícitas com = true, usa as funções diretamente
-- ==============================================================================

begin;

-- Remover política de INSERT atual
drop policy if exists bookings_insert on public.bookings;

-- Recriar política usando funções diretamente (sem = true)
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Se for anon, APENAS permite reservas públicas
  (
    auth.uid() is null
    and status = 'pending_payment'
    and customer_name is not null
    and trim(customer_name) != ''
    and customer_phone is not null
    and trim(customer_phone) != ''
    and start_time is not null
    and end_time is not null
    and total_price is not null
    and total_price >= 0
    -- Usa funções diretamente (sem = true)
    and public.fn_is_public_tenant(tenant_id)
    and public.fn_is_active_court_for_tenant(court_id, tenant_id)
  )
  OR
  -- Se for authenticated, permite se for dono OU reserva pública
  (
    auth.uid() is not null
    and (
      -- É dono do tenant
      public.fn_is_tenant_owner(tenant_id)
      OR
      -- OU é reserva pública válida
      (
        status = 'pending_payment'
        and customer_name is not null
        and trim(customer_name) != ''
        and customer_phone is not null
        and trim(customer_phone) != ''
        and start_time is not null
        and end_time is not null
        and total_price is not null
        and total_price >= 0
        and public.fn_is_public_tenant(tenant_id)
        and public.fn_is_active_court_for_tenant(court_id, tenant_id)
      )
    )
  )
);

comment on policy bookings_insert on public.bookings is 'Política simplificada: anon apenas reservas públicas; authenticated se for dono OU reserva pública';

commit;
