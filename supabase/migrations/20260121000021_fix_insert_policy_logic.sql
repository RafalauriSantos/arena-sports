-- ==============================================================================
-- CORRIGIR LÓGICA DA POLÍTICA DE INSERT
-- ==============================================================================
-- Remove e recria a política de INSERT com lógica correta
-- ==============================================================================

begin;

-- Remover política de INSERT atual
drop policy if exists bookings_insert on public.bookings;

-- Recriar política de INSERT com lógica correta
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Caso 1: É dono do tenant (para authenticated users)
  (auth.uid() is not null and exists (
    select 1 from public.tenants t 
    where t.id = tenant_id and t.owner_id = auth.uid()
  ))
  OR
  -- Caso 2: Reserva pública válida (usando funções security definer que bypassam RLS)
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
);

comment on policy bookings_insert on public.bookings is 'Permite INSERT para donos OU reservas públicas usando funções security definer';

commit;
