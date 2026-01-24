-- ==============================================================================
-- CORRIGIR POLÍTICA DE INSERT PÚBLICO DE RESERVAS
-- ==============================================================================
-- Corrige a política para usar verificações diretas em vez de funções,
-- evitando problemas de permissão com RLS em funções security definer.
-- ==============================================================================

begin;

-- Remove a política antiga
drop policy if exists bookings_public_insert on public.bookings;

-- Cria nova política com verificações diretas (sem funções auxiliares)
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

comment on policy bookings_public_insert on public.bookings is 'Permite que usuários anônimos criem reservas públicas (status pending_payment) para tenants com subdomain - versão corrigida com verificações diretas';

commit;
