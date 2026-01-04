-- Fix onboarding prerequisites:
-- 1) saas_products must be readable by anon/authenticated (GRANT), not only via RLS policy.
-- 2) tenants.saas_id (uuid FK) should have a safe default to avoid client inserts failing.

begin;

-- Ensure the Arena Sports product exists (best-effort, no unique constraint assumed).
insert into public.saas_products (name, slug, active, created_at)
select 'Arena Sports', 'arena-sports', true, now()
where not exists (
  select 1
  from public.saas_products sp
  where sp.slug = 'arena-sports'
);

-- If it exists but is inactive, activate it.
update public.saas_products
set active = true
where slug = 'arena-sports';

-- IMPORTANT: RLS policies do not grant privileges.
grant select on table public.saas_products to anon, authenticated;

-- Provide a stable default resolver for the current SaaS product.
create or replace function public.fn_default_saas_product_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sp.id
  from public.saas_products sp
  where sp.slug = 'arena-sports'
  order by sp.active desc nulls last, sp.created_at desc nulls last
  limit 1;
$$;

grant execute on function public.fn_default_saas_product_id() to anon, authenticated;

-- Set tenants.saas_id default when the column exists and is uuid.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'saas_id'
  ) then
    if (
      select c.udt_name
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'tenants'
        and c.column_name = 'saas_id'
      limit 1
    ) = 'uuid' then
      execute 'alter table public.tenants alter column saas_id set default public.fn_default_saas_product_id()';
    end if;
  end if;
end $$;

commit;
