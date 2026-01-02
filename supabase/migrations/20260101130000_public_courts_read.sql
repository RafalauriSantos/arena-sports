-- Public read for active courts (BookingPublic)
--
-- Objetivo: permitir que a página pública de agendamento consiga listar quadras
-- sem exigir login, mantendo o restante do banco protegido.
--
-- Observação: mantemos escopo restrito a quadras ativas de tenants "publicados"
-- (subdomain preenchido).

begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'courts'
      and policyname = 'courts_public_read_active'
  ) then
    create policy courts_public_read_active
    on public.courts
    for select
    to anon
    using (
      active = true
      and exists (
        select 1
        from public.tenants t
        where t.id = courts.tenant_id
          and t.subdomain is not null
      )
    );
  end if;
end $$;

commit;
