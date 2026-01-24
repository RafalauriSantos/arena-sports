-- ==============================================================================
-- PERMITIR CRIAÇÃO DE RESERVAS PÚBLICAS (ANON)
-- ==============================================================================
-- Esta migration permite que usuários anônimos criem reservas através do
-- link público, mas com validações de segurança rigorosas.
-- ==============================================================================

begin;

-- Função auxiliar para verificar se um tenant é público (tem subdomain)
create or replace function public.is_public_tenant(p_tenant_id uuid)
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

-- Função auxiliar para verificar se uma quadra está ativa e pertence ao tenant
create or replace function public.is_active_court_for_tenant(p_court_id uuid, p_tenant_id uuid)
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

-- Política RLS para permitir INSERT de reservas públicas (anon)
-- Apenas permite inserção se:
-- 1. Tenant tem subdomain (é público)
-- 2. Quadra está ativa e pertence ao tenant
-- 3. Status é "pending_payment" (pagar no balcão)
-- 4. Campos obrigatórios estão preenchidos
drop policy if exists bookings_public_insert on public.bookings;
create policy bookings_public_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Tenant deve ser público (ter subdomain) - verificação direta
  exists (
    select 1
    from public.tenants t
    where t.id = tenant_id
      and t.subdomain is not null
      and trim(t.subdomain) != ''
  )
  -- Quadra deve estar ativa e pertencer ao tenant - verificação direta
  and exists (
    select 1
    from public.courts c
    where c.id = court_id
      and c.tenant_id = tenant_id
      and c.active = true
  )
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

-- Comentários
comment on function public.is_public_tenant(uuid) is 'Verifica se um tenant é público (tem subdomain válido)';
comment on function public.is_active_court_for_tenant(uuid, uuid) is 'Verifica se uma quadra está ativa e pertence ao tenant especificado';
comment on policy bookings_public_insert on public.bookings is 'Permite que usuários anônimos criem reservas públicas (status pending_payment) para tenants com subdomain';

-- Grants necessários
grant execute on function public.is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.is_active_court_for_tenant(uuid, uuid) to anon, authenticated;

commit;
