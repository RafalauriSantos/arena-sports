-- Migration: Permitir que usuários autenticados também vejam courts públicos
-- Data: 2026-01-21
-- Descrição: A política atual só permite anon, mas quando o usuário está logado, precisa também poder ver courts públicos

begin;

-- Atualizar política para incluir authenticated
drop policy if exists courts_public_read_active on public.courts;

-- Criar política que permite acesso público a courts ativos (para anon E authenticated)
-- IMPORTANTE: authenticated também precisa poder ver courts públicos para o link funcionar quando logado
create policy courts_public_read_active on public.courts 
for select 
to anon, authenticated
using (
  active = true 
  and exists (
    select 1 
    from public.tenants t 
    where t.id = courts.tenant_id 
    and t.subdomain is not null
  )
);

-- Garantir que authenticated também tem GRANT
grant select on table public.courts to authenticated;

-- Comentário explicativo
comment on policy courts_public_read_active on public.courts is 
'Permite acesso público (anon e authenticated) para leitura de courts ativos de tenants que têm subdomain configurado. Necessário para o link público /agendar/:subdomain funcionar mesmo quando o usuário está logado.';

commit;
