-- Execute estes comandos no Supabase Dashboard > SQL Editor
-- para restaurar o banco de dados COMPLETAMENTE
-- Consolidado dos 3 arquivos master migrations (2026-01-11)
-- Este arquivo contém: Estrutura + Lógica + Segurança
-- 
-- ==============================================================================

-- ==============================================================================
-- MASTER STRUCTURE MIGRATION
-- Arquivo idempotente para criação da estrutura física do banco de dados
-- Pode ser executado múltiplas vezes sem quebrar
-- ==============================================================================

begin;

-- ==============================================================================
-- 1. EXTENSÕES NECESSÁRIAS
-- ==============================================================================

create extension if not exists btree_gist;

-- ==============================================================================
-- 2. CRIAÇÃO DE TABELAS
-- ==============================================================================

-- Tabela de produtos SaaS
create table if not exists public.saas_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean default true,
  created_at timestamptz not null default now()
);

-- Tabela de tenants (arenas)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text,
  subdomain text unique,
  saas_id uuid references public.saas_products(id),
  cpf_cnpj text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de perfis de usuários
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tenant_id uuid references public.tenants(id),
  cpf_cnpj text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de quadras
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sports jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de reservas
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  total_price numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  deposit_percent numeric,
  status text not null default 'pending',
  booked_by text,
  customer_phone text,
  customer_name text,
  customer_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de mensalistas (reservas recorrentes)
create table if not exists public.recurring_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de eventos de auditoria das reservas
create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  booking_id uuid,
  actor_user_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Tabela de regras de promoção
create table if not exists public.promotion_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null,
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de assinaturas dos tenants
create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan_code text not null,
  plan_name text not null,
  monthly_price numeric not null,
  status text not null default 'trial',
  billing_interval text not null default 'month',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_checkout_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de admins do SaaS
create table if not exists public.saas_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Tabela de webhooks do ASAAS
create table if not exists public.asaas_webhook_events (
  event_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'processing',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Tabela de eventos de webhook (idempotência)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz default now(),
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 3. ADIÇÃO DE COLUNAS (SE NÃO EXISTIREM)
-- ==============================================================================

-- Garantir colunas em tenants
alter table public.tenants
  add column if not exists business_name text,
  add column if not exists subdomain text,
  add column if not exists saas_id uuid references public.saas_products(id),
  add column if not exists cpf_cnpj text,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em profiles
alter table public.profiles
  add column if not exists email text,
  add column if not exists tenant_id uuid references public.tenants(id),
  add column if not exists cpf_cnpj text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em courts
alter table public.courts
  add column if not exists sports jsonb default '[]'::jsonb,
  add column if not exists images jsonb default '[]'::jsonb,
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em bookings
alter table public.bookings
  add column if not exists status text not null default 'pending',
  add column if not exists paid_amount numeric(10,2) not null default 0,
  add column if not exists deposit_percent numeric,
  add column if not exists booked_by text,
  add column if not exists customer_phone text,
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em recurring_slots
alter table public.recurring_slots
  add column if not exists end_time time,
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em promotion_rules
alter table public.promotion_rules
  add column if not exists discount_type text not null default 'percentage',
  add column if not exists discount_value numeric,
  add column if not exists description text,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em tenant_subscriptions
alter table public.tenant_subscriptions
  add column if not exists plan_code text,
  add column if not exists plan_name text,
  add column if not exists monthly_price numeric,
  add column if not exists status text not null default 'trial',
  add column if not exists billing_interval text not null default 'month',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists grace_ends_at timestamptz,
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists asaas_checkout_id text,
  add column if not exists updated_at timestamptz not null default now();

-- Garantir colunas em asaas_webhook_events
alter table public.asaas_webhook_events
  add column if not exists status text not null default 'processing',
  add column if not exists processed_at timestamptz;

-- ==============================================================================
-- 4. ÍNDICES DE PERFORMANCE
-- ==============================================================================

create index if not exists idx_tenants_owner on public.tenants(owner_id);
create index if not exists idx_tenants_subdomain on public.tenants(subdomain);
create index if not exists idx_tenants_saas_id on public.tenants(saas_id);
create index if not exists idx_tenants_cpf_cnpj on public.tenants(cpf_cnpj) where cpf_cnpj is not null;

create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_cpf_cnpj on public.profiles(cpf_cnpj) where cpf_cnpj is not null;
create index if not exists idx_profiles_onboarding_completed_at on public.profiles(onboarding_completed_at) where onboarding_completed_at is not null;

create index if not exists idx_courts_tenant on public.courts(tenant_id);

create index if not exists idx_bookings_tenant on public.bookings(tenant_id);
create index if not exists idx_bookings_court on public.bookings(court_id);
create index if not exists idx_bookings_dates on public.bookings(start_time, end_time);
create index if not exists idx_bookings_tenant_court_date on public.bookings(tenant_id, court_id, start_time);

create index if not exists idx_recurring_tenant on public.recurring_slots(tenant_id);
create index if not exists idx_recurring_court on public.recurring_slots(court_id);

create index if not exists booking_events_tenant_created_idx on public.booking_events (tenant_id, created_at desc);
create index if not exists booking_events_booking_created_idx on public.booking_events (booking_id, created_at desc);

create index if not exists idx_promotion_rules_tenant on public.promotion_rules(tenant_id);

create index if not exists tenant_subscriptions_asaas_customer_idx on public.tenant_subscriptions (asaas_customer_id);
create index if not exists tenant_subscriptions_asaas_subscription_idx on public.tenant_subscriptions (asaas_subscription_id);

create index if not exists idx_webhook_events_event_id on public.webhook_events(event_id);
create index if not exists idx_webhook_events_event_type on public.webhook_events(event_type);
create index if not exists idx_webhook_events_created_at on public.webhook_events(created_at);

-- ==============================================================================
-- 5. CONSTRAINTS
-- ==============================================================================

-- Constraints para bookings
alter table public.bookings
  drop constraint if exists bookings_paid_amount_nonnegative,
  add constraint bookings_paid_amount_nonnegative check (paid_amount >= 0);

alter table public.bookings
  drop constraint if exists bookings_paid_amount_lte_total,
  add constraint bookings_paid_amount_lte_total check (paid_amount <= total_price);

alter table public.bookings
  drop constraint if exists bookings_deposit_percent_range,
  add constraint bookings_deposit_percent_range check (deposit_percent is null or (deposit_percent > 0 and deposit_percent <= 100));

alter table public.bookings
  drop constraint if exists bookings_no_overlap_active,
  add constraint bookings_no_overlap_active exclude using gist (
    tenant_id with =,
    court_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (tenant_id is not null and court_id is not null and coalesce(status,'pending') in ('pending','paid'));

-- Constraints para recurring_slots
alter table public.recurring_slots
  drop constraint if exists recurring_slots_day_of_week_check,
  add constraint recurring_slots_day_of_week_check check (day_of_week between 0 and 6);

-- Constraints para promotion_rules
alter table public.promotion_rules
  drop constraint if exists promotion_rules_discount_type_check,
  add constraint promotion_rules_discount_type_check check (discount_type in ('percentage', 'fixed'));

-- Constraints para tenant_subscriptions
alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_status_check,
  add constraint tenant_subscriptions_status_check check (status in ('trial', 'active', 'past_due', 'cancelled'));

alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_billing_interval_check,
  add constraint tenant_subscriptions_billing_interval_check check (billing_interval in ('month', 'year'));

-- Constraints para asaas_webhook_events
alter table public.asaas_webhook_events
  drop constraint if exists asaas_webhook_events_status_check,
  add constraint asaas_webhook_events_status_check check (status in ('processing', 'done', 'failed'));

-- ==============================================================================
-- 6. LIMPEZA DE DADOS DUPLICADOS
-- ==============================================================================

-- Deduplicar bookings (manter o mais recente pago, ou criado)
with ranked as (
  select
    id,
    row_number() over (
      partition by tenant_id, court_id, start_time, end_time
      order by
        case when status = 'paid' then 0 else 1 end,
        created_at desc,
        id desc
    ) as rn
  from public.bookings
  where tenant_id is not null
    and court_id is not null
    and start_time is not null
    and end_time is not null
    and coalesce(status,'pending') in ('pending','paid')
)
delete from public.bookings b
using ranked r
where b.id = r.id
  and r.rn > 1;

-- Deduplicar profiles por id (manter o mais recente)
with ranked as (
  select
    ctid,
    id,
    row_number() over (
      partition by id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.profiles
)
delete from public.profiles p
using ranked r
where p.ctid = r.ctid
  and r.rn > 1;

-- Deduplicar tenant_subscriptions por tenant_id (manter o mais recente)
with ranked as (
  select
    ctid,
    tenant_id,
    row_number() over (
      partition by tenant_id
      order by updated_at desc nulls last, created_at desc nulls last, ctid desc
    ) as rn
  from public.tenant_subscriptions
)
delete from public.tenant_subscriptions t
using ranked r
where t.ctid = r.ctid
  and r.rn > 1;

-- ==============================================================================
-- 7. CONSTRAINTS ÚNICAS (SE NÃO EXISTIREM)
-- ==============================================================================

-- Garantir unicidade de subdomain em tenants
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tenants'::regclass
      and contype = 'u'
      and conname = 'tenants_subdomain_key'
  ) then
    alter table public.tenants add constraint tenants_subdomain_key unique (subdomain);
  end if;
end $$;

-- Garantir unicidade de tenant_id em tenant_subscriptions
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tenant_subscriptions'::regclass
      and contype = 'u'
      and conname = 'tenant_subscriptions_tenant_id_key'
  ) then
    alter table public.tenant_subscriptions add constraint tenant_subscriptions_tenant_id_key unique (tenant_id);
  end if;
end $$;

-- Garantir unicidade de event_id em webhook_events
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webhook_events'::regclass
      and contype = 'u'
      and conname = 'webhook_events_event_id_key'
  ) then
    alter table public.webhook_events add constraint webhook_events_event_id_key unique (event_id);
  end if;
end $$;

commit;
begin;

-- ==============================================================================
-- 1. FUNÇÕES HELPER
-- ==============================================================================

-- Verifica se usuário é admin da plataforma (Suporte)
create or replace function public.fn_is_saas_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.saas_admin_users a where a.user_id = auth.uid());
$$;

-- Verifica acesso ao tenant (Paywall + Trial + Admin)
create or replace function public.fn_tenant_has_access(p_tenant_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  s public.tenant_subscriptions%rowtype;
  v_trial_ends timestamptz;
begin
  if p_tenant_id is null then return false; end if;
  if public.fn_is_saas_admin() then return true; end if; -- Admin entra sempre

  select * into s from public.tenant_subscriptions where tenant_id = p_tenant_id;

  if not found then
    -- Fallback: Se não tem assinatura, verifica se o tenant é novo (< 21 dias)
    return (select created_at + interval '21 days' > now() from public.tenants where id = p_tenant_id);
  end if;

  if s.status = 'active' then return true; end if;
  
  if s.status = 'trial' then
    if s.trial_started_at is null then return false; end if;
    v_trial_ends := coalesce(s.trial_ends_at, s.trial_started_at + interval '21 days');
    return v_trial_ends > now();
  end if;

  if s.status = 'past_due' then
    return coalesce(s.grace_ends_at, now()) > now();
  end if;

  return false;
end $$;

-- Verifica se é dono do tenant (Usado no RLS)
create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = auth.uid());
$$;

-- Helper para produto padrão
create or replace function public.fn_default_saas_product_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.saas_products where slug = 'arena-sports' order by active desc nulls last, created_at desc nulls last limit 1;
$$;

-- Helper para criar perfis faltantes (Manutenção)
create or replace function public.fix_missing_profiles()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  select au.id, au.email, au.created_at, now()
  from auth.users au left join public.profiles p on p.id = au.id
  where p.id is null
  on conflict (id) do nothing;
end;
$$;

-- Validação de Telefone (WhatsApp)
create or replace function public.fn_bookings_require_customer_phone()
returns trigger language plpgsql as $$
begin
  if new.customer_phone is null or new.customer_phone !~ '^[0-9]{10,11}$' then
    raise exception using errcode = '23514', message = 'Telefone obrigatório (DDD + número, apenas dígitos).';
  end if;
  return new;
end;
$$;

-- Inicializa assinatura Trial ao criar Tenant
create or replace function public.fn_init_tenant_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tenant_subscriptions (tenant_id, plan_code, plan_name, monthly_price, status, billing_interval, trial_ends_at, grace_ends_at)
  values (new.id, 'start', 'Arena Start', 89, 'trial', 'month', now() + interval '21 days', now() + interval '24 days')
  on conflict (tenant_id) do nothing;
  return new;
end $$;

-- Cria perfil ao cadastrar usuário (Auth Trigger)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;
  return new;
exception when others then
  return new; -- Evita bloquear o signup se der erro no profile
end;
$$;

-- ==============================================================================
-- 2. FUNÇÕES RPC (ONBOARDING & CALENDÁRIO)
-- ==============================================================================

-- RPC Onboarding (Cria Tenant e Vincula Usuário)
drop function if exists public.fn_onboard_user(text, text);
create or replace function public.fn_onboard_user(p_business_name text, p_saas_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_saas_id uuid;
  v_subdomain text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  -- 1. Garante Profile
  insert into public.profiles (id, email) values (v_user_id, (select email from auth.users where id = v_user_id)) on conflict (id) do nothing;

  -- 2. Se já tem tenant, retorna ele
  select tenant_id into v_tenant_id from public.profiles where id = v_user_id;
  if v_tenant_id is not null then return v_tenant_id; end if;

  -- 3. Resolve SaaS ID
  select id into v_saas_id from public.saas_products where slug = p_saas_slug limit 1;
  if v_saas_id is null then 
    -- Fallback se não achar o slug
    select id into v_saas_id from public.saas_products limit 1; 
  end if;

  -- 4. Gera Subdomínio Único
  v_subdomain := lower(regexp_replace(p_business_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || left(v_user_id::text, 4);
  
  -- 5. Cria Tenant
  insert into public.tenants (owner_id, business_name, subdomain, saas_id)
  values (v_user_id, p_business_name, v_subdomain, v_saas_id)
  returning id into v_tenant_id;

  -- 6. Atualiza Profile
  update public.profiles set tenant_id = v_tenant_id where id = v_user_id;

  return v_tenant_id;
end;
$$;

-- RPC Calendário Público (Com Paywall Check)
drop function if exists public.fn_public_get_occupied_slots(text, date);
create or replace function public.fn_public_get_occupied_slots(p_subdomain text, p_date date)
returns table (court_id uuid, slot_time time)
language sql stable security definer set search_path = public as $$
  with t as (
    select id as tenant_id from public.tenants
    where subdomain = p_subdomain and subdomain is not null
    and public.fn_tenant_has_access(id) -- O Paywall Check
    limit 1
  ),
  booking_occ as (
    select b.court_id, (b.start_time at time zone 'America/Sao_Paulo')::time as slot_time
    from public.bookings b join t on t.tenant_id = b.tenant_id
    where (b.start_time at time zone 'America/Sao_Paulo')::date = p_date
      and coalesce(b.status, 'pending') in ('pending', 'paid') and b.court_id is not null
  ),
  recurring_occ as (
    select r.court_id, r.start_time::time as slot_time
    from public.recurring_slots r join t on t.tenant_id = r.tenant_id
    where r.active = true and r.day_of_week = extract(dow from p_date)::int and r.court_id is not null
  )
  select * from booking_occ union select * from recurring_occ;
$$;

-- RPC Progresso Fundadores
drop function if exists public.get_founders_progress();
create or replace function public.get_founders_progress()
returns table (cap integer, sold integer, remaining integer)
language sql stable security definer set search_path = public as $$
  select 
    100::int as cap,
    count(*)::int as sold,
    (100 - count(*))::int as remaining
  from public.tenant_subscriptions
  where plan_code = 'pro' and status = 'active' and billing_interval = 'year';
$$;

-- ==============================================================================
-- 3. TRIGGERS
-- ==============================================================================

-- Função de Auditoria (Definição Única)
create or replace function public.trg_log_booking_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid; v_booking_id uuid; v_actor uuid; v_old jsonb; v_new jsonb;
begin
  v_actor := auth.uid();
  if tg_op = 'INSERT' then
    v_tenant_id := new.tenant_id; v_booking_id := new.id; v_old := null;
    v_new := jsonb_build_object('court_id', new.court_id, 'start_time', new.start_time, 'status', new.status, 'paid_amount', new.paid_amount);
  elsif tg_op = 'UPDATE' then
    v_tenant_id := coalesce(new.tenant_id, old.tenant_id); v_booking_id := coalesce(new.id, old.id);
    v_old := jsonb_build_object('court_id', old.court_id, 'start_time', old.start_time, 'status', old.status, 'paid_amount', old.paid_amount);
    v_new := jsonb_build_object('court_id', new.court_id, 'start_time', new.start_time, 'status', new.status, 'paid_amount', new.paid_amount);
  elsif tg_op = 'DELETE' then
    v_tenant_id := old.tenant_id; v_booking_id := old.id;
    v_old := jsonb_build_object('court_id', old.court_id, 'start_time', old.start_time, 'status', old.status, 'paid_amount', old.paid_amount);
    v_new := null;
  end if;
  insert into public.booking_events (tenant_id, booking_id, actor_user_id, action, old_data, new_data)
  values (v_tenant_id, v_booking_id, v_actor, tg_op, v_old, v_new);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Aplicação dos Triggers
drop trigger if exists booking_audit_trail on public.bookings;
create trigger booking_audit_trail after insert or update or delete on public.bookings for each row execute function public.trg_log_booking_event();

drop trigger if exists trg_init_tenant_subscription on public.tenants;
create trigger trg_init_tenant_subscription after insert on public.tenants for each row execute function public.fn_init_tenant_subscription();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists trg_bookings_require_customer_phone on public.bookings;
create trigger trg_bookings_require_customer_phone before insert or update of customer_phone on public.bookings for each row execute function public.fn_bookings_require_customer_phone();

-- ==============================================================================
-- 4. GRANTS (Permissões de Execução)
-- ==============================================================================

grant execute on function public.fn_tenant_has_access(uuid) to authenticated, anon;
grant execute on function public.fn_is_saas_admin() to authenticated, anon;
grant execute on function public.is_tenant_owner(uuid) to authenticated, anon;
grant execute on function public.fn_default_saas_product_id() to authenticated, anon;
grant execute on function public.fix_missing_profiles() to authenticated;
grant execute on function public.fn_bookings_require_customer_phone() to authenticated;
grant execute on function public.fn_init_tenant_subscription() to authenticated;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.fn_onboard_user(text, text) to authenticated;
grant execute on function public.fn_public_get_occupied_slots(text, date) to authenticated, anon;
grant execute on function public.get_founders_progress() to authenticated, anon;
grant execute on function public.trg_log_booking_event() to authenticated;

commit;
begin;

-- ==============================================================================
-- 1. FUNÇÕES DE SEGURANÇA RLS
-- ==============================================================================

-- Função centralizada para verificar acesso ao tenant (Cérebro da Segurança)
-- Hoje: Verifica Dono. Futuro: Verificará Staff também.
create or replace function public.check_tenant_access(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public -- Segurança extra contra hijacking
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.owner_id = auth.uid()

    /* -- Espaço reservado para lógica de Staff (futuro)
    UNION ALL
    select 1 from public.tenant_members tm where tm.tenant_id = p_tenant_id and tm.user_id = auth.uid()
    */
  );
$$;

-- ==============================================================================
-- 2. HABILITAR RLS EM TODAS AS TABELAS
-- ==============================================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.bookings enable row level security;
alter table public.recurring_slots enable row level security;
alter table public.booking_events enable row level security;
alter table public.promotion_rules enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.saas_products enable row level security;
alter table public.saas_admin_users enable row level security;
alter table public.asaas_webhook_events enable row level security;
alter table public.webhook_events enable row level security;

-- ==============================================================================
-- 3. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- --- SAAS_PRODUCTS ---
drop policy if exists saas_products_select_policy on public.saas_products;
create policy saas_products_select_policy on public.saas_products for select to authenticated, anon using (true);

-- --- SAAS_ADMIN_USERS ---
drop policy if exists saas_admin_users_self_select on public.saas_admin_users;
create policy saas_admin_users_self_select on public.saas_admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists saas_admin_users_service_all on public.saas_admin_users;
create policy saas_admin_users_service_all on public.saas_admin_users for all to service_role using (true) with check (true);

-- --- TENANTS ---
drop policy if exists tenants_public_read_by_subdomain on public.tenants;
create policy tenants_public_read_by_subdomain on public.tenants for select to anon using (subdomain is not null);

drop policy if exists tenants_access_policy on public.tenants;
create policy tenants_access_policy on public.tenants for all to authenticated using (
    owner_id = auth.uid() OR id IN (select id from public.tenants where public.check_tenant_access(id))
);

-- --- PROFILES ---
drop policy if exists profiles_self_access on public.profiles;
create policy profiles_self_access on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- --- COURTS ---
drop policy if exists courts_public_read_active on public.courts;
create policy courts_public_read_active on public.courts for select to anon using (
  active = true and exists (select 1 from public.tenants t where t.id = courts.tenant_id and t.subdomain is not null)
);

drop policy if exists courts_owner_all on public.courts;
create policy courts_owner_all on public.courts for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists courts_service_all on public.courts;
create policy courts_service_all on public.courts for all to service_role using (true) with check (true);

-- --- BOOKINGS ---
drop policy if exists bookings_owner_all on public.bookings;
create policy bookings_owner_all on public.bookings for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings for all to service_role using (true) with check (true);

-- --- RECURRING_SLOTS ---
drop policy if exists recurring_slots_owner_all on public.recurring_slots;
create policy recurring_slots_owner_all on public.recurring_slots for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists recurring_slots_service_all on public.recurring_slots;
create policy recurring_slots_service_all on public.recurring_slots for all to service_role using (true) with check (true);

-- --- BOOKING_EVENTS (Auditoria) ---
drop policy if exists booking_events_tenant_members on public.booking_events;
create policy booking_events_tenant_members on public.booking_events for select 
using (public.check_tenant_access(tenant_id));

-- --- PROMOTION_RULES ---
drop policy if exists promotion_rules_owner_all on public.promotion_rules;
create policy promotion_rules_owner_all on public.promotion_rules for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists promotion_rules_service_all on public.promotion_rules;
create policy promotion_rules_service_all on public.promotion_rules for all to service_role using (true) with check (true);

-- --- TENANT_SUBSCRIPTIONS ---
drop policy if exists tenant_subscriptions_tenant_select on public.tenant_subscriptions;
create policy tenant_subscriptions_tenant_select on public.tenant_subscriptions for select to authenticated using (
  (select public.fn_is_saas_admin()) OR public.check_tenant_access(tenant_id)
);

drop policy if exists tenant_subscriptions_service_all on public.tenant_subscriptions;
create policy tenant_subscriptions_service_all on public.tenant_subscriptions for all to service_role using (true) with check (true);

-- --- ASAAS_WEBHOOK_EVENTS ---
drop policy if exists asaas_webhook_events_saas_admin_select on public.asaas_webhook_events;
create policy asaas_webhook_events_saas_admin_select on public.asaas_webhook_events for select to authenticated using (public.fn_is_saas_admin());

drop policy if exists asaas_webhook_events_service_all on public.asaas_webhook_events;
create policy asaas_webhook_events_service_all on public.asaas_webhook_events for all to service_role using (true) with check (true);

-- --- WEBHOOK_EVENTS ---
drop policy if exists webhook_events_service_role_only on public.webhook_events;
create policy webhook_events_service_role_only on public.webhook_events for all to service_role using (true) with check (true);

-- ==============================================================================
-- 4. VIEWS PÚBLICAS PARA ACESSO ANÔNIMO SEGURO
-- ==============================================================================

-- View para quadras públicas
drop view if exists public.public_courts_view;
create or replace view public.public_courts_view as
select id, tenant_id, name, sports, images, active
from public.courts where active = true;

grant select on public.public_courts_view to anon, authenticated;

-- View para bookings públicas (apenas horários ocupados)
drop view if exists public.public_bookings_view;
create or replace view public.public_bookings_view as
select id, tenant_id, court_id, start_time, end_time, status
from public.bookings where status <> 'cancelled';

grant select on public.public_bookings_view to anon, authenticated;

-- ==============================================================================
-- 5. GRANTS PARA TABELAS E VIEWS
-- ==============================================================================

-- Grants para service_role (Edge Functions)
grant select, insert, update on table public.tenants to service_role;
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.courts to service_role;
grant select, insert, update, delete on table public.bookings to service_role;
grant select, insert, update, delete on table public.recurring_slots to service_role;
grant select, insert on table public.booking_events to service_role;
grant select, insert, update, delete on table public.promotion_rules to service_role;
grant select, insert, update on table public.tenant_subscriptions to service_role;
grant select on table public.saas_products to service_role;
grant select, insert, update on table public.saas_admin_users to service_role;
grant select, insert, update on table public.asaas_webhook_events to service_role;
grant select, insert on table public.webhook_events to service_role;

-- Grants para authenticated (O RLS vai filtrar o que eles podem ver/editar)
grant select, insert, update, delete on table public.tenants to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.courts to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;
grant select, insert, update, delete on table public.recurring_slots to authenticated;
grant select on table public.booking_events to authenticated;
grant select, insert, update, delete on table public.promotion_rules to authenticated;
grant select on table public.tenant_subscriptions to authenticated;
grant select on table public.saas_products to authenticated, anon;
grant select on table public.saas_admin_users to authenticated;

-- Grants para anon (apenas leituras públicas)
grant select on table public.saas_products to anon;

-- ==============================================================================
-- 6. FUNÇÃO PARA LIMPEZA DE WEBHOOKS ANTIGOS (OPCIONAL)
-- ==============================================================================

create or replace function public.cleanup_old_webhook_events()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.webhook_events where created_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_old_webhook_events() to service_role;

commit;

