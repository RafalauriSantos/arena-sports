-- ==============================================================================
-- ISOLAR COMPLETAMENTE A POLÍTICA DE INSERT
-- ==============================================================================
-- Garante que a política de INSERT não seja afetada por outras políticas
-- ==============================================================================

begin;

-- Remover TODAS as políticas existentes
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_owner_operations on public.bookings;
drop policy if exists bookings_owner_ops on public.bookings;
drop policy if exists bookings_public_insert on public.bookings;
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

-- Política ESPECÍFICA para INSERT - VERSÃO ULTRA SIMPLIFICADA
-- Usa verificações diretas sem funções para evitar problemas
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Caso 1: É dono do tenant
  (auth.uid() is not null and exists (
    select 1 from public.tenants t 
    where t.id = tenant_id and t.owner_id = auth.uid()
  ))
  OR
  -- Caso 2: Reserva pública válida (verificações diretas)
  (
    status = 'pending_payment'
    and exists (
      select 1 from public.tenants t
      where t.id = tenant_id
        and t.subdomain is not null
        and trim(t.subdomain) != ''
    )
    and exists (
      select 1 from public.courts c
      where c.id = court_id
        and c.tenant_id = tenant_id
        and c.active = true
    )
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

-- Garantir service_role
drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings 
for all 
to service_role 
using (true) 
with check (true);

-- Comentários
comment on policy bookings_insert on public.bookings is 'Permite INSERT para donos OU reservas públicas (pending_payment) usando verificações diretas EXISTS';

commit;
