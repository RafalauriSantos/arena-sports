begin;

-- ==============================================================================
-- 1. EXTENSÕES NECESSÁRIAS
-- ==============================================================================

create extension if not exists btree_gist;

-- ==============================================================================
-- 2. CRIAÇÃO DE TABELAS (GARANTIA BÁSICA)
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

-- Tabela de reservas (CRIAÇÃO BÁSICA - O RESTO GARANTIMOS NO ALTER)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
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
-- 3. ATUALIZAÇÃO ESTRUTURAL (COLUNAS - A CURA PARA O ERRO)
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

-- Garantir colunas em bookings (CRÍTICO: Lista completa para evitar erro)
alter table public.bookings
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists court_id uuid references public.courts(id) on delete cascade,
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz,
  add column if not exists total_price numeric(10,2) not null default 0,
  add column if not exists status text not null default 'pending', -- <--- AQUI ESTÁ A CORREÇÃO
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
do $$ begin
  alter table public.bookings add constraint bookings_paid_amount_nonnegative check (paid_amount >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bookings add constraint bookings_paid_amount_lte_total check (paid_amount <= total_price);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bookings add constraint bookings_deposit_percent_range check (deposit_percent is null or (deposit_percent > 0 and deposit_percent <= 100));
exception when duplicate_object then null; end $$;

-- A constraint mais importante (Anti-Duplicidade)
-- Primeiro removemos para recriar (caso exista com erro)
alter table public.bookings drop constraint if exists bookings_no_overlap_active;

-- Aplica a constraint com segurança (DO $$ block para evitar erro de duplicidade)
do $$
begin
  alter table public.bookings
    add constraint bookings_no_overlap_active
    exclude using gist (
      tenant_id with =,
      court_id with =,
      tstzrange(start_time, end_time, '[)') with &&
    )
    where (tenant_id is not null and court_id is not null and coalesce(status,'pending') in ('pending','paid'));
exception when duplicate_object then null;
end $$;

-- Constraints para recurring_slots
do $$ begin
  alter table public.recurring_slots add constraint recurring_slots_day_of_week_check check (day_of_week between 0 and 6);
exception when duplicate_object then null; end $$;

-- Constraints para promotion_rules
do $$ begin
  alter table public.promotion_rules add constraint promotion_rules_discount_type_check check (discount_type in ('percentage', 'fixed'));
exception when duplicate_object then null; end $$;

-- Constraints para tenant_subscriptions
do $$ begin
  alter table public.tenant_subscriptions add constraint tenant_subscriptions_status_check check (status in ('trial', 'active', 'past_due', 'cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tenant_subscriptions add constraint tenant_subscriptions_billing_interval_check check (billing_interval in ('month', 'year'));
exception when duplicate_object then null; end $$;

-- Constraints para asaas_webhook_events
do $$ begin
  alter table public.asaas_webhook_events add constraint asaas_webhook_events_status_check check (status in ('processing', 'done', 'failed'));
exception when duplicate_object then null; end $$;

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
  if not exists (select 1 from pg_constraint where conname = 'tenants_subdomain_key') then
    alter table public.tenants add constraint tenants_subdomain_key unique (subdomain);
  end if;
end $$;

-- Garantir unicidade de tenant_id em tenant_subscriptions
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenant_subscriptions_tenant_id_key') then
    alter table public.tenant_subscriptions add constraint tenant_subscriptions_tenant_id_key unique (tenant_id);
  end if;
end $$;

-- Garantir unicidade de event_id em webhook_events
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'webhook_events_event_id_key') then
    alter table public.webhook_events add constraint webhook_events_event_id_key unique (event_id);
  end if;
end $$;

commit;