-- Ensure required UNIQUE/PK constraints for upserts and ON CONFLICT clauses
--
-- Why:
-- - Errors like 42P10 ("no unique or exclusion constraint matching the ON CONFLICT specification")
--   occur when code uses ON CONFLICT but the target column has no UNIQUE/PK constraint.
-- - profiles.id is expected to be unique (1 row per auth user).
-- - tenant_subscriptions.tenant_id is expected to be unique (1 subscription row per tenant).

begin;

-- 1) Deduplicate profiles(id) if duplicates exist, keeping the most recent row.
do $$
declare
  has_updated_at boolean;
  has_created_at boolean;
  sql text;
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping: public.profiles does not exist';
  else

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updated_at'
  ) into has_updated_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'created_at'
  ) into has_created_at;

  if has_updated_at and has_created_at then
    sql := $dedupe$
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
    $dedupe$;
  elsif has_created_at then
    sql := $dedupe$
      with ranked as (
        select
          ctid,
          id,
          row_number() over (
            partition by id
            order by created_at desc nulls last, ctid desc
          ) as rn
        from public.profiles
      )
      delete from public.profiles p
      using ranked r
      where p.ctid = r.ctid
        and r.rn > 1;
    $dedupe$;
  else
    sql := $dedupe$
      with ranked as (
        select
          ctid,
          id,
          row_number() over (
            partition by id
            order by ctid desc
          ) as rn
        from public.profiles
      )
      delete from public.profiles p
      using ranked r
      where p.ctid = r.ctid
        and r.rn > 1;
    $dedupe$;
  end if;

  execute sql;
  end if;
end $$;

-- 2) Ensure profiles(id) has a PRIMARY KEY (or at least UNIQUE).
do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'Skipping: public.profiles does not exist';
  else

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype in ('p', 'u')
      and pg_get_constraintdef(c.oid) ilike '%(id)%'
  ) then
    -- Prefer PK, but if it fails for some reason, at least create UNIQUE.
    begin
      alter table public.profiles add constraint profiles_pkey primary key (id);
    exception when others then
      alter table public.profiles add constraint profiles_id_key unique (id);
    end;
  end if;
  end if;
end $$;

-- 3) Ensure tenant_subscriptions(tenant_id) is UNIQUE for upserts.
--    First, deduplicate tenant_subscriptions by tenant_id (keep most recent row).
do $$
declare
  has_updated_at boolean;
  has_created_at boolean;
  sql text;
begin
  if to_regclass('public.tenant_subscriptions') is null then
    raise notice 'Skipping: public.tenant_subscriptions does not exist';
  else

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_subscriptions'
      and column_name = 'updated_at'
  ) into has_updated_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_subscriptions'
      and column_name = 'created_at'
  ) into has_created_at;

  if has_updated_at and has_created_at then
    sql := $dedupe_ts$
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
    $dedupe_ts$;
  elsif has_created_at then
    sql := $dedupe_ts$
      with ranked as (
        select
          ctid,
          tenant_id,
          row_number() over (
            partition by tenant_id
            order by created_at desc nulls last, ctid desc
          ) as rn
        from public.tenant_subscriptions
      )
      delete from public.tenant_subscriptions t
      using ranked r
      where t.ctid = r.ctid
        and r.rn > 1;
    $dedupe_ts$;
  else
    sql := $dedupe_ts$
      with ranked as (
        select
          ctid,
          tenant_id,
          row_number() over (
            partition by tenant_id
            order by ctid desc
          ) as rn
        from public.tenant_subscriptions
      )
      delete from public.tenant_subscriptions t
      using ranked r
      where t.ctid = r.ctid
        and r.rn > 1;
    $dedupe_ts$;
  end if;

  execute sql;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.tenant_subscriptions'::regclass
      and c.contype in ('p', 'u')
      and pg_get_constraintdef(c.oid) ilike '%(tenant_id)%'
  ) then
    alter table public.tenant_subscriptions
      add constraint tenant_subscriptions_tenant_id_key unique (tenant_id);
  end if;
  end if;
end $$;

commit;
