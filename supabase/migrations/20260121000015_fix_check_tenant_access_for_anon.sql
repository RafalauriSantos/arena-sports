-- ==============================================================================
-- CORRIGIR FUNÇÃO check_tenant_access PARA NÃO FALHAR COM ANON
-- ==============================================================================
-- A função check_tenant_access pode estar falhando para usuários anônimos
-- quando chamada na política. Vamos garantir que ela retorne false (não erro)
-- para usuários anônimos.
-- ==============================================================================

begin;

-- Recriar função check_tenant_access para lidar melhor com anon
create or replace function public.check_tenant_access(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Se não há usuário autenticado, retorna false (não erro)
  select case 
    when auth.uid() is null then false
    else exists (
      select 1
      from public.tenants t
      where t.id = p_tenant_id
        and t.owner_id = auth.uid()
    )
  end;
$$;

comment on function public.check_tenant_access(uuid) is 'Verifica se o usuário autenticado é dono do tenant. Retorna false para usuários anônimos (não erro).';

commit;
