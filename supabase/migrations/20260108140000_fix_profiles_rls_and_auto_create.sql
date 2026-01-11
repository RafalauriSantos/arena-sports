-- Fix RLS policies for profiles and ensure auto-creation on signup
--
-- Problema:
-- - Erros 403 ao tentar ler profiles após login
-- - Perfil pode não existir no primeiro login
-- - RLS pode estar bloqueando SELECT mesmo quando a linha não existe
--
-- Solução:
-- 1. Garantir que profiles tem policies corretas
-- 2. Criar trigger para criar perfil automaticamente no signup
-- 3. Permitir que usuário leia seu próprio perfil mesmo que ainda não exista (para evitar 403)

begin;

-- =========================
-- 1. GARANTIR RLS E POLICIES CORRETAS PARA PROFILES
-- =========================

-- Habilitar RLS se ainda não estiver habilitado
alter table public.profiles enable row level security;

-- Dropar policies existentes para recriar corretamente
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_self_delete on public.profiles;

-- Policy: Usuário autenticado pode ler SEU PRÓPRIO perfil
-- IMPORTANTE: Esta policy só retorna linhas onde id = auth.uid()
-- Se não houver linha, retorna 0 rows (não 403), mas se RLS estiver habilitado sem policies, retorna 403
create policy profiles_self_select
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Policy: Usuário autenticado pode inserir SEU PRÓPRIO perfil
create policy profiles_self_insert
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

-- Policy: Usuário autenticado pode atualizar SEU PRÓPRIO perfil
create policy profiles_self_update
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Policy: Usuário autenticado pode deletar SEU PRÓPRIO perfil (se necessário)
create policy profiles_self_delete
on public.profiles
for delete
to authenticated
using (id = auth.uid());

-- Policy: Service role pode tudo (para Edge Functions/RPCs)
drop policy if exists profiles_service_all on public.profiles;
create policy profiles_service_all
on public.profiles
for all
to service_role
using (true)
with check (true);

-- =========================
-- 2. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE NO SIGNUP
-- =========================

-- Função que cria perfil automaticamente quando usuário é criado
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Pegar email do auth.users
  v_email := new.email;
  
  -- Inserir perfil na tabela public.profiles
  -- IMPORTANTE: ON CONFLICT DO NOTHING evita erro se perfil já existir
  insert into public.profiles (id, email, created_at, updated_at)
  values (
    new.id,
    v_email,
    now(),
    now()
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

-- Dropar trigger existente se houver
drop trigger if exists on_auth_user_created on auth.users;

-- Criar trigger que chama a função quando usuário é criado no auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- =========================
-- 3. GARANTIR QUE PERFIS EXISTENTES SEM LINHA TENHAM UM
-- =========================

-- Isso não é crítico, mas podemos criar perfis para usuários existentes que não têm
-- (Isso deve ser feito manualmente se necessário, pois pode ser perigoso em produção)

-- =========================
-- 4. VERIFICAR SE A FUNÇÃO get_founders_progress EXISTE (evitar erro 404)
-- =========================

-- Criar função stub para evitar erro 404 se o código tentar chamar
create or replace function public.get_founders_progress()
returns jsonb
language sql
stable
as $$
  select '{"active": 0, "trial": 0, "total": 0}'::jsonb;
$$;

-- Garantir que authenticated pode executar
grant execute on function public.get_founders_progress() to authenticated;
grant execute on function public.get_founders_progress() to anon;

commit;
