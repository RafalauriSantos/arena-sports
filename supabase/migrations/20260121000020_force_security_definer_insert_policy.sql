-- ==============================================================================
-- FORÇAR POLÍTICA DE INSERT COM SECURITY DEFINER
-- ==============================================================================
-- Remove TODAS as políticas e recria usando APENAS funções security definer
-- ==============================================================================

begin;

-- Remover TODAS as políticas existentes de bookings
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_public_insert on public.bookings;
drop policy if exists bookings_owner_operations on public.bookings;
drop policy if exists bookings_owner_ops on public.bookings;
drop policy if exists bookings_owner_all on public.bookings;
drop policy if exists bookings_owner_select on public.bookings;
drop policy if exists bookings_owner_update on public.bookings;
drop policy if exists bookings_owner_delete on public.bookings;

-- Garantir que as funções security definer existam
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

-- Política ESPECÍFICA para INSERT - USANDO APENAS FUNÇÕES SECURITY DEFINER
-- Esta é a única política de INSERT, então não há conflito
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Caso 1: É dono do tenant (criar função security definer para verificar ownership)
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

-- Garantir service_role
drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings 
for all 
to service_role 
using (true) 
with check (true);

-- Grants nas funções
grant execute on function public.fn_is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.fn_is_active_court_for_tenant(uuid, uuid) to anon, authenticated;

-- Comentários
comment on function public.fn_is_public_tenant(uuid) is 'Verifica se um tenant é público (tem subdomain válido) - security definer bypassa RLS';
comment on function public.fn_is_active_court_for_tenant(uuid, uuid) is 'Verifica se uma quadra está ativa e pertence ao tenant - security definer bypassa RLS';
comment on policy bookings_insert on public.bookings is 'Permite INSERT para donos OU reservas públicas usando APENAS funções security definer';

commit;
