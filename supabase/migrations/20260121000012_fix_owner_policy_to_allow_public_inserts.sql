-- ==============================================================================
-- CORRIGIR POLÍTICA DO OWNER PARA NÃO BLOQUEAR INSERTs PÚBLICOS
-- ==============================================================================
-- O problema: Quando há múltiplas políticas, todas devem passar (AND).
-- Se o usuário está autenticado mas não é dono, bookings_owner_all bloqueia.
-- Solução: Modificar bookings_owner_all para também permitir INSERTs públicos.
-- ==============================================================================

begin;

-- Remover política do owner
drop policy if exists bookings_owner_all on public.bookings;

-- Recriar política do owner que permite:
-- 1. Operações do dono (usando check_tenant_access)
-- 2. INSERTs públicos (status pending_payment para tenants públicos)
create policy bookings_owner_all on public.bookings 
for all 
to authenticated 
using (
  public.check_tenant_access(tenant_id)
) 
with check (
  -- Permite se for o dono OU se for um INSERT público
  public.check_tenant_access(tenant_id)
  OR (
    -- INSERT público: status pending_payment + tenant público + court ativo
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

comment on policy bookings_owner_all on public.bookings is 'Permite operações do dono do tenant OU INSERTs públicos (status pending_payment para tenants com subdomain)';

commit;
