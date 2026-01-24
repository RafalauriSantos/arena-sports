-- ==============================================================================
-- ADICIONAR FUNÇÃO SECURITY DEFINER PARA VERIFICAR OWNERSHIP
-- ==============================================================================
-- Cria função que bypassa RLS para verificar se usuário é dono do tenant
-- ==============================================================================

begin;

-- Função para verificar se o usuário autenticado é dono do tenant
create or replace function public.fn_is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case 
    when auth.uid() is null then false
    else exists (
      select 1
      from public.tenants t
      where t.id = p_tenant_id
        and t.owner_id = auth.uid()
    )
  end;
$$;

-- Remover política de INSERT atual
drop policy if exists bookings_insert on public.bookings;

-- Recriar política de INSERT usando a função security definer para ownership
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Caso 1: É dono do tenant (usando função security definer)
  public.fn_is_tenant_owner(tenant_id)
  OR
  -- Caso 2: Reserva pública válida (usando funções security definer)
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

-- Grant na função
grant execute on function public.fn_is_tenant_owner(uuid) to anon, authenticated;

-- Comentários
comment on function public.fn_is_tenant_owner(uuid) is 'Verifica se o usuário autenticado é dono do tenant - security definer bypassa RLS';
comment on policy bookings_insert on public.bookings is 'Permite INSERT para donos OU reservas públicas usando APENAS funções security definer';

commit;
