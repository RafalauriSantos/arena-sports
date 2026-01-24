-- ==============================================================================
-- CRIAR FUNÇÃO ÚNICA DE VALIDAÇÃO PARA RESERVAS PÚBLICAS
-- ==============================================================================
-- Cria uma função security definer que valida tudo de uma vez
-- ==============================================================================

begin;

-- Função única que valida se uma reserva pública pode ser inserida
create or replace function public.fn_can_insert_public_booking(
  p_tenant_id uuid,
  p_court_id uuid,
  p_status text,
  p_customer_name text,
  p_customer_phone text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_total_price numeric
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Se não for status pending_payment, não permite
  if p_status != 'pending_payment' then
    return false;
  end if;

  -- Validações de campos obrigatórios
  if p_customer_name is null or trim(p_customer_name) = '' then
    return false;
  end if;

  if p_customer_phone is null or trim(p_customer_phone) = '' then
    return false;
  end if;

  if p_start_time is null or p_end_time is null then
    return false;
  end if;

  if p_total_price is null or p_total_price < 0 then
    return false;
  end if;

  -- Verificar se tenant é público (tem subdomain)
  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.subdomain is not null
      and trim(t.subdomain) != ''
  ) then
    return false;
  end if;

  -- Verificar se court está ativa e pertence ao tenant
  if not exists (
    select 1
    from public.courts c
    where c.id = p_court_id
      and c.tenant_id = p_tenant_id
      and c.active = true
  ) then
    return false;
  end if;

  -- Todas as validações passaram
  return true;
end;
$$;

-- Remover política de INSERT atual
drop policy if exists bookings_insert on public.bookings;

-- Criar política usando a função única de validação
create policy bookings_insert on public.bookings
for insert
to anon, authenticated
with check (
  -- Se for anon, APENAS permite reservas públicas validadas pela função
  (
    auth.uid() is null
    and public.fn_can_insert_public_booking(
      tenant_id,
      court_id,
      status,
      customer_name,
      customer_phone,
      start_time,
      end_time,
      total_price
    )
  )
  OR
  -- Se for authenticated, permite se for dono OU reserva pública válida
  (
    auth.uid() is not null
    and (
      -- É dono do tenant
      public.fn_is_tenant_owner(tenant_id)
      OR
      -- OU é reserva pública válida
      public.fn_can_insert_public_booking(
        tenant_id,
        court_id,
        status,
        customer_name,
        customer_phone,
        start_time,
        end_time,
        total_price
      )
    )
  )
);

-- Grant na função
grant execute on function public.fn_can_insert_public_booking(uuid, uuid, text, text, text, timestamptz, timestamptz, numeric) to anon, authenticated;

-- Comentários
comment on function public.fn_can_insert_public_booking(uuid, uuid, text, text, text, timestamptz, timestamptz, numeric) is 'Valida se uma reserva pública pode ser inserida - security definer bypassa RLS';
comment on policy bookings_insert on public.bookings is 'Permite INSERT: anon apenas reservas públicas validadas; authenticated se for dono OU reserva pública válida';

commit;
