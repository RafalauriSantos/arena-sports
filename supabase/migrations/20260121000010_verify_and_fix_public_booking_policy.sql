-- ==============================================================================
-- VERIFICAR E CORRIGIR POLÍTICA DE INSERT PÚBLICO DE RESERVAS
-- ==============================================================================
-- Esta migration verifica se as funções existem e recria a política
-- ==============================================================================

begin;

-- Garantir que as funções existem e estão corretas
create or replace function public.fn_is_public_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.subdomain is not null
      and trim(t.subdomain) != ''
  );
$$;

create or replace function public.fn_is_active_court_for_tenant(p_court_id uuid, p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courts c
    where c.id = p_court_id
      and c.tenant_id = p_tenant_id
      and c.active = true
  );
$$;

-- Remover TODAS as políticas de INSERT existentes para anon/authenticated
drop policy if exists bookings_public_insert on public.bookings;
drop policy if exists bookings_owner_all on public.bookings;

-- Recriar política do owner (authenticated que é dono)
create policy bookings_owner_all on public.bookings 
for all 
to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

-- Criar política pública de INSERT (deve ser a última para ter prioridade)
create policy bookings_public_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Tenant deve ser público (ter subdomain)
  public.fn_is_public_tenant(tenant_id)
  -- Quadra deve estar ativa e pertencer ao tenant
  and public.fn_is_active_court_for_tenant(court_id, tenant_id)
  -- Status deve ser pending_payment (apenas reservas para pagar no balcão)
  and status = 'pending_payment'
  -- Campos obrigatórios
  and customer_name is not null
  and trim(customer_name) != ''
  and customer_phone is not null
  and trim(customer_phone) != ''
  and start_time is not null
  and end_time is not null
  and total_price is not null
  and total_price >= 0
);

-- Garantir grants
grant execute on function public.fn_is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.fn_is_active_court_for_tenant(uuid, uuid) to anon, authenticated;

-- Garantir que service_role ainda tem acesso total
drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings 
for all 
to service_role 
using (true) 
with check (true);

-- Comentários
comment on function public.fn_is_public_tenant(uuid) is 'Verifica se um tenant é público (tem subdomain válido) - security definer bypassa RLS';
comment on function public.fn_is_active_court_for_tenant(uuid, uuid) is 'Verifica se uma quadra está ativa e pertence ao tenant - security definer bypassa RLS';
comment on policy bookings_public_insert on public.bookings is 'Permite que usuários anônimos criem reservas públicas usando funções security definer que bypassam RLS';

commit;
