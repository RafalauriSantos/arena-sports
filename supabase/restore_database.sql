-- Script para recriar o banco de dados após reset
-- Execute este script no Supabase Dashboard > SQL Editor

-- Primeiro, criar as tabelas básicas que são esperadas pelas migrações

-- Tabela tenants
create table if not exists public.tenants (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    business_name text,
    subdomain text unique,
    owner_id uuid references auth.users(id) on delete cascade,
    settings jsonb default '{}'::jsonb,
    saas_id uuid
);

-- Tabela profiles
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    tenant_id uuid references public.tenants(id) on delete cascade,
    full_name text,
    email text,
    avatar_url text,
    job_title text
);

-- Tabela courts
create table if not exists public.courts (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    name text not null,
    sport text not null,
    is_active boolean default true,
    settings jsonb default '{}'::jsonb
);

-- Tabela tenant_subscriptions
create table if not exists public.tenant_subscriptions (
    tenant_id uuid references public.tenants(id) on delete cascade primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    plan_code text,
    plan_name text,
    monthly_price integer,
    status text check (status in ('trial', 'active', 'past_due', 'canceled')),
    billing_interval text check (billing_interval in ('month', 'year')),
    trial_started_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    grace_ends_at timestamp with time zone,
    asaas_customer_id text,
    asaas_subscription_id text,
    asaas_checkout_id text,
    stripe_customer_id text,
    stripe_subscription_id text
);

-- Outras tabelas básicas
create table if not exists public.bookings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    court_id uuid references public.courts(id) on delete cascade not null,
    customer_name text not null,
    customer_email text,
    customer_phone text,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    status text default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
    total_price integer,
    deposit_amount integer,
    notes text
);

-- Agora executar as migrações em ordem
-- Execute cada migração individualmente no Dashboard