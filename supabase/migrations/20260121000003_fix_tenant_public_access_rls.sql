-- Migration: Corrigir política RLS para acesso público de tenants por subdomain
-- Data: 2026-01-21
-- Descrição: Ajusta a política RLS para garantir que usuários anônimos possam buscar tenants por subdomain

begin;

-- Remover política antiga
drop policy if exists tenants_public_read_by_subdomain on public.tenants;

-- Criar política que permite busca pública por subdomain (para anon E authenticated)
-- IMPORTANTE: authenticated também precisa poder ver tenants públicos para o link funcionar quando logado
create policy tenants_public_read_by_subdomain on public.tenants 
for select 
to anon, authenticated
using (
  subdomain is not null 
  and trim(subdomain) != ''
);

-- Garantir que o GRANT está aplicado
grant select on table public.tenants to anon;

-- Comentário explicativo
comment on policy tenants_public_read_by_subdomain on public.tenants is 
'Permite acesso público (anon) para leitura de tenants que têm subdomain configurado e não vazio. Necessário para o link público /agendar/:subdomain funcionar.';

commit;
