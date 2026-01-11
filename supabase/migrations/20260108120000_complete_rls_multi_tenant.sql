-- Complete RLS for all multi-tenant tables
--
-- Objetivo: Habilitar RLS em todas tabelas críticas que ainda não têm proteção completa
-- Baseado no audit: AUDIT_RLS_COMPLETO.md
--
-- Tabelas que esta migration protege:
-- 1. courts (CRUD completo para owner)
-- 2. bookings (CRUD completo para owner)
-- 3. promotion_rules (CRUD completo para owner)
--
-- Tabelas que já têm RLS (verificadas):
-- - tenants ✅ (20260101090000_mvp_rls_owner_only.sql)
-- - profiles ✅ (20260101090000_mvp_rls_owner_only.sql)
-- - tenant_subscriptions ✅ (20260102150000_tenant_subscriptions_read_by_profile.sql)
-- - booking_events ✅ (20260101170000_booking_audit_trail.sql)
-- - asaas_webhook_events ✅ (20260106100000_asaas_support.sql)

begin;

-- =========================
-- COURTS (Quadras)
-- =========================
-- Nota: Já existe policy pública (courts_public_read_active) para anon ler quadras ativas.
-- Agora adicionamos RLS completo para authenticated (owner-only CRUD).

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courts'
      and policyname = 'courts_owner_all'
  ) then
    -- Habilitar RLS se ainda não estiver habilitado
    alter table public.courts enable row level security;

    -- Policy: Owner pode fazer tudo (SELECT/INSERT/UPDATE/DELETE) nas suas próprias quadras
    create policy courts_owner_all
    on public.courts
    for all
    to authenticated
    using (public.is_tenant_owner(tenant_id))
    with check (public.is_tenant_owner(tenant_id));

    -- Policy: Service role pode tudo (para Edge Functions/RPCs)
    create policy courts_service_all
    on public.courts
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;

-- =========================
-- BOOKINGS (Reservas)
-- =========================
-- CRÍTICO: Esta é a tabela mais importante para proteger (dados sensíveis de clientes)

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'bookings_owner_all'
  ) then
    -- Habilitar RLS se ainda não estiver habilitado
    alter table public.bookings enable row level security;

    -- Policy: Owner pode fazer tudo (SELECT/INSERT/UPDATE/DELETE) nas suas próprias reservas
    create policy bookings_owner_all
    on public.bookings
    for all
    to authenticated
    using (public.is_tenant_owner(tenant_id))
    with check (public.is_tenant_owner(tenant_id));

    -- Policy: Service role pode tudo (para Edge Functions/RPCs que processam reservas)
    create policy bookings_service_all
    on public.bookings
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;

-- =========================
-- PROMOTION_RULES (Regras de Promoção)
-- =========================
-- Permite que o owner gerencie promoções da sua arena

do $$
begin
  -- Verificar se a tabela existe antes de criar policies
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'promotion_rules'
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'promotion_rules'
        and policyname = 'promotion_rules_owner_all'
    ) then
      -- Habilitar RLS se ainda não estiver habilitado
      alter table public.promotion_rules enable row level security;

      -- Policy: Owner pode fazer tudo (SELECT/INSERT/UPDATE/DELETE) nas suas próprias regras
      create policy promotion_rules_owner_all
      on public.promotion_rules
      for all
      to authenticated
      using (public.is_tenant_owner(tenant_id))
      with check (public.is_tenant_owner(tenant_id));

      -- Policy: Service role pode tudo
      create policy promotion_rules_service_all
      on public.promotion_rules
      for all
      to service_role
      using (true)
      with check (true);
    end if;
  end if;
end $$;

-- =========================
-- RECURRING_SLOTS (Mensalistas) - Se existir
-- =========================
-- Tabela para reservas recorrentes (mensalistas)

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'recurring_slots'
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'recurring_slots'
        and policyname = 'recurring_slots_owner_all'
    ) then
      alter table public.recurring_slots enable row level security;

      create policy recurring_slots_owner_all
      on public.recurring_slots
      for all
      to authenticated
      using (public.is_tenant_owner(tenant_id))
      with check (public.is_tenant_owner(tenant_id));

      create policy recurring_slots_service_all
      on public.recurring_slots
      for all
      to service_role
      using (true)
      with check (true);
    end if;
  end if;
end $$;

-- =========================
-- ÍNDICES DE PERFORMANCE
-- =========================
-- Garantir índices para queries frequentes por tenant_id

create index if not exists courts_tenant_id_idx
  on public.courts (tenant_id);

create index if not exists bookings_tenant_id_idx
  on public.bookings (tenant_id);

create index if not exists bookings_tenant_court_date_idx
  on public.bookings (tenant_id, court_id, start_time);

create index if not exists promotion_rules_tenant_id_idx
  on public.promotion_rules (tenant_id)
  where exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'promotion_rules'
  );

commit;
