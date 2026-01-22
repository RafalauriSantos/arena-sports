-- Migration: Permitir que usuários autenticados também vejam tenants públicos por subdomain
-- Data: 2026-01-21
-- Descrição: A política atual só permite anon, mas quando o usuário está logado, precisa também poder ver tenants públicos

begin;

-- Atualizar política para incluir authenticated
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

-- Garantir que authenticated também tem GRANT
grant select on table public.tenants to authenticated;

-- Comentário explicativo
comment on policy tenants_public_read_by_subdomain on public.tenants is 
'Permite acesso público (anon e authenticated) para leitura de tenants que têm subdomain configurado e não vazio. Necessário para o link público /agendar/:subdomain funcionar mesmo quando o usuário está logado.';

commit;
