-- ==============================================================================
-- SIMPLIFICAR POLÍTICA DE INSERT PÚBLICO - VERSÃO DEFINITIVA
-- ==============================================================================
-- Remove todas as políticas e cria uma única política simples para INSERT
-- que permite tanto donos quanto reservas públicas
-- ==============================================================================

begin;

-- Remover TODAS as políticas existentes de bookings
drop policy if exists bookings_public_insert on public.bookings;
drop policy if exists bookings_owner_all on public.bookings;
drop policy if exists bookings_owner_select on public.bookings;
drop policy if exists bookings_owner_update on public.bookings;
drop policy if exists bookings_owner_delete on public.bookings;

-- Criar política única para SELECT/UPDATE/DELETE do owner
create policy bookings_owner_operations on public.bookings 
for all 
to authenticated 
using (
  public.check_tenant_access(tenant_id)
) 
with check (
  public.check_tenant_access(tenant_id)
);

-- Criar política ESPECÍFICA para INSERT (única política de INSERT)
-- Esta política permite INSERT se:
-- 1. O usuário é dono do tenant, OU
-- 2. É uma reserva pública (pending_payment + tenant público + court ativa)
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Opção 1: É o dono do tenant (permite qualquer INSERT)
  public.check_tenant_access(tenant_id)
  OR
  -- Opção 2: É uma reserva pública válida
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

-- Garantir que service_role ainda tem acesso total
drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings 
for all 
to service_role 
using (true) 
with check (true);

-- Comentários
comment on policy bookings_owner_operations on public.bookings is 'Permite SELECT/UPDATE/DELETE apenas para o dono do tenant';
comment on policy bookings_insert on public.bookings is 'Permite INSERT para donos OU reservas públicas (status pending_payment) de tenants com subdomain';

commit;
