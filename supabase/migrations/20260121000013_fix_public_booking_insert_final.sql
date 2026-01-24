-- ==============================================================================
-- CORREÇÃO FINAL DEFINITIVA: POLÍTICA DE INSERT PÚBLICO
-- ==============================================================================
-- Problema: Múltiplas políticas RLS com AND lógico bloqueiam INSERTs públicos
-- Solução: Criar política específica apenas para INSERT que seja permissiva
-- ==============================================================================

begin;

-- Garantir que as funções existem
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

-- Remover TODAS as políticas existentes
drop policy if exists bookings_public_insert on public.bookings;
drop policy if exists bookings_owner_all on public.bookings;
drop policy if exists bookings_owner_select on public.bookings;
drop policy if exists bookings_owner_update on public.bookings;
drop policy if exists bookings_owner_delete on public.bookings;

-- Criar política para SELECT/UPDATE/DELETE do owner
-- Para INSERT, usamos a política pública separada
create policy bookings_owner_select on public.bookings 
for select
to authenticated 
using (
  public.check_tenant_access(tenant_id)
);

create policy bookings_owner_update on public.bookings 
for update
to authenticated 
using (
  public.check_tenant_access(tenant_id)
) 
with check (
  public.check_tenant_access(tenant_id)
);

create policy bookings_owner_delete on public.bookings 
for delete
to authenticated 
using (
  public.check_tenant_access(tenant_id)
);

-- Criar política ESPECÍFICA para INSERT (anon e authenticated)
-- Esta é a única política que permite INSERT, então não há conflito
create policy bookings_public_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Se for o dono do tenant, permite qualquer INSERT
  public.check_tenant_access(tenant_id)
  OR (
    -- Se não for o dono, só permite INSERT público (pending_payment)
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

-- Grants necessários
grant execute on function public.fn_is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.fn_is_active_court_for_tenant(uuid, uuid) to anon, authenticated;

-- Comentários
comment on function public.fn_is_public_tenant(uuid) is 'Verifica se um tenant é público (tem subdomain válido) - security definer bypassa RLS';
comment on function public.fn_is_active_court_for_tenant(uuid, uuid) is 'Verifica se uma quadra está ativa e pertence ao tenant - security definer bypassa RLS';
comment on policy bookings_owner_select on public.bookings is 'Permite SELECT apenas para o dono do tenant';
comment on policy bookings_owner_update on public.bookings is 'Permite UPDATE apenas para o dono do tenant';
comment on policy bookings_owner_delete on public.bookings is 'Permite DELETE apenas para o dono do tenant';
comment on policy bookings_public_insert on public.bookings is 'Permite INSERT para donos OU para reservas públicas (status pending_payment) de tenants com subdomain';

commit;
