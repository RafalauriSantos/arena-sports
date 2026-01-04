-- Create onboarding RPC to ensure profile + tenant for new signups
--
-- Why:
-- - New users were failing onboarding (400 on rpc fn_onboard_user) and ended up
--   without profiles.tenant_id, causing checkout/paywall flows to break.
--
-- Goals:
-- - Ensure profile exists for auth.uid()
-- - Ensure a tenant exists and is owned by auth.uid()
-- - Set profiles.tenant_id
-- - Work even when client-side fallback insert is blocked by RLS

begin;

-- Remote DB already has a fn_onboard_user(text,text) with a different return type.
-- Postgres cannot change return types via CREATE OR REPLACE, so we drop and recreate.
drop function if exists public.fn_onboard_user(text, text);

create function public.fn_onboard_user(
  p_business_name text,
  p_saas_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing_tenant_id uuid;
  v_tenant_id uuid;
  v_business_name text;
  v_suffix text;
  v_base text;
  v_subdomain text;
  v_attempt int;

  v_has_profiles_email boolean;
  v_has_profiles_tenant_id boolean;

  v_has_tenants_owner_id boolean;
  v_has_tenants_business_name boolean;
  v_has_tenants_subdomain boolean;
  v_has_tenants_saas_id boolean;
  v_has_tenants_saas_slug boolean;

  v_claims jsonb;
  v_email text;

  v_cols text;
  v_vals text;
  v_sql text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'Missing table public.profiles';
  end if;
  if to_regclass('public.tenants') is null then
    raise exception 'Missing table public.tenants';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email'
  ) into v_has_profiles_email;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'tenant_id'
  ) into v_has_profiles_tenant_id;

  if not v_has_profiles_tenant_id then
    raise exception 'profiles.tenant_id column is required for onboarding';
  end if;

  -- Parse email from JWT claims if available
  v_claims := null;
  begin
    v_claims := current_setting('request.jwt.claims', true)::jsonb;
  exception when others then
    v_claims := null;
  end;
  v_email := null;
  if v_claims is not null then
    v_email := nullif(v_claims->>'email', '');
  end if;

  -- Ensure profile row exists
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    if v_has_profiles_email then
      execute 'insert into public.profiles (id, email) values ('
        || quote_literal(v_user_id::text) || ', '
        || quote_nullable(v_email) ||
        ') on conflict (id) do nothing';
    else
      execute 'insert into public.profiles (id) values ('
        || quote_literal(v_user_id::text) ||
        ') on conflict (id) do nothing';
    end if;
  end if;

  -- If already onboarded, return current tenant_id
  select p.tenant_id
    into v_existing_tenant_id
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_existing_tenant_id is not null then
    return v_existing_tenant_id;
  end if;

  -- Detect tenant columns
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'owner_id'
  ) into v_has_tenants_owner_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'business_name'
  ) into v_has_tenants_business_name;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'subdomain'
  ) into v_has_tenants_subdomain;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'saas_id'
  ) into v_has_tenants_saas_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'saas_slug'
  ) into v_has_tenants_saas_slug;

  if not v_has_tenants_owner_id then
    raise exception 'tenants.owner_id column is required for onboarding';
  end if;

  v_business_name := coalesce(nullif(trim(p_business_name), ''), 'Minha Arena');

  -- Create a simple slug (ASCII-only best effort)
  v_base := lower(v_business_name);
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '(^-+|-+$)', '', 'g');
  if length(v_base) > 40 then
    v_base := left(v_base, 40);
  end if;
  if v_base = '' then
    v_base := 'arena';
  end if;

  v_suffix := left(replace(v_user_id::text, '-', ''), 6);

  v_attempt := 0;
  while v_attempt < 3 loop
    v_subdomain := v_base || '-' || v_suffix;
    if v_attempt > 0 then
      v_subdomain := v_subdomain || '-' || (v_attempt + 1)::text;
    end if;

    v_cols := 'owner_id';
    v_vals := quote_literal(v_user_id::text);

    if v_has_tenants_business_name then
      v_cols := v_cols || ', business_name';
      v_vals := v_vals || ', ' || quote_literal(v_business_name);
    end if;

    if v_has_tenants_subdomain then
      v_cols := v_cols || ', subdomain';
      v_vals := v_vals || ', ' || quote_literal(v_subdomain);
    end if;

    -- Support either saas_id or saas_slug depending on schema
    if v_has_tenants_saas_id then
      v_cols := v_cols || ', saas_id';
      v_vals := v_vals || ', ' || quote_nullable(p_saas_slug);
    elsif v_has_tenants_saas_slug then
      v_cols := v_cols || ', saas_slug';
      v_vals := v_vals || ', ' || quote_nullable(p_saas_slug);
    end if;

    v_sql := 'insert into public.tenants (' || v_cols || ') values (' || v_vals || ') returning id';

    begin
      execute v_sql into v_tenant_id;
      exit;
    exception
      when unique_violation then
        v_attempt := v_attempt + 1;
        continue;
      when others then
        raise;
    end;
  end loop;

  if v_tenant_id is null then
    raise exception 'Failed to create tenant';
  end if;

  update public.profiles
  set tenant_id = v_tenant_id
  where id = v_user_id;

  return v_tenant_id;
end;
$$;

grant execute on function public.fn_onboard_user(text, text) to authenticated;

commit;
