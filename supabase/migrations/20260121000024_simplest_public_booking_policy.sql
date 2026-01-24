-- ==============================================================================
-- POLÍTICA MAIS SIMPLES POSSÍVEL PARA RESERVAS PÚBLICAS
-- ==============================================================================
-- Remove TODAS as políticas e cria uma versão ultra-simplificada
-- que deve funcionar para anon
-- ==============================================================================

begin;

-- Remover TODAS as políticas existentes
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_public_insert on public.bookings;
drop policy if exists bookings_owner_operations on public.bookings;
drop policy if exists bookings_owner_ops on public.bookings;
drop policy if exists bookings_owner_all on public.bookings;
drop policy if exists bookings_owner_select on public.bookings;
drop policy if exists bookings_owner_update on public.bookings;
drop policy if exists bookings_owner_delete on public.bookings;

-- Política para SELECT do owner
create policy bookings_owner_select on public.bookings 
for select
to authenticated 
using (
  public.check_tenant_access(tenant_id)
);

-- Política para UPDATE do owner
create policy bookings_owner_update on public.bookings 
for update
to authenticated 
using (
  public.check_tenant_access(tenant_id)
) 
with check (
  public.check_tenant_access(tenant_id)
);

-- Política para DELETE do owner
create policy bookings_owner_delete on public.bookings 
for delete
to authenticated 
using (
  public.check_tenant_access(tenant_id)
);

-- Política de INSERT - VERSÃO ULTRA SIMPLIFICADA
-- Para anon: APENAS reservas públicas (status pending_payment)
-- Para authenticated: se for dono OU reserva pública
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Se for anon, APENAS permite reservas públicas
  (
    auth.uid() is null
    and status = 'pending_payment'
    -- Validações básicas de campos
    and customer_name is not null
    and trim(customer_name) != ''
    and customer_phone is not null
    and trim(customer_phone) != ''
    and start_time is not null
    and end_time is not null
    and total_price is not null
    and total_price >= 0
    -- Validações de tenant e court usando funções security definer
    and public.fn_is_public_tenant(tenant_id) = true
    and public.fn_is_active_court_for_tenant(court_id, tenant_id) = true
  )
  OR
  -- Se for authenticated, permite se for dono OU reserva pública
  (
    auth.uid() is not null
    and (
      -- É dono do tenant
      public.fn_is_tenant_owner(tenant_id) = true
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
        and public.fn_is_public_tenant(tenant_id) = true
        and public.fn_is_active_court_for_tenant(court_id, tenant_id) = true
      )
    )
  )
);

-- Garantir service_role
drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings 
for all 
to service_role 
using (true) 
with check (true);

-- Comentários
comment on policy bookings_insert on public.bookings is 'Política simplificada: anon apenas reservas públicas; authenticated se for dono OU reserva pública';

commit;
