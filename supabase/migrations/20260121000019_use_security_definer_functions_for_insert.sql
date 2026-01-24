-- ==============================================================================
-- USAR FUNÇÕES SECURITY DEFINER PARA POLÍTICA DE INSERT
-- ==============================================================================
-- As funções security definer podem bypassar RLS, então devem funcionar
-- ==============================================================================

begin;

-- Garantir que as funções security definer existam e estejam corretas
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

-- Remover a política atual de INSERT
drop policy if exists bookings_insert on public.bookings;

-- Criar política de INSERT usando as funções security definer
-- IMPORTANTE: Para anon, só permite reservas públicas (pending_payment)
-- Para authenticated, permite se for dono OU se for reserva pública
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Caso 1: É dono do tenant (apenas para authenticated)
  (auth.uid() is not null and exists (
    select 1 from public.tenants t 
    where t.id = tenant_id and t.owner_id = auth.uid()
  ))
  OR
  -- Caso 2: Reserva pública válida (anon OU authenticated não-dono)
  -- Usa funções security definer que bypassam RLS
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

-- Garantir grants nas funções
grant execute on function public.fn_is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.fn_is_active_court_for_tenant(uuid, uuid) to anon, authenticated;

-- Comentários
comment on function public.fn_is_public_tenant(uuid) is 'Verifica se um tenant é público (tem subdomain válido) - security definer bypassa RLS';
comment on function public.fn_is_active_court_for_tenant(uuid, uuid) is 'Verifica se uma quadra está ativa e pertence ao tenant - security definer bypassa RLS';
comment on policy bookings_insert on public.bookings is 'Permite INSERT para donos OU reservas públicas usando funções security definer que bypassam RLS';

commit;
