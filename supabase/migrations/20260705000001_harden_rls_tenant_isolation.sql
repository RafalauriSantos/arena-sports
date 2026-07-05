-- Harden multi-tenant RLS boundaries and exposed SECURITY DEFINER RPCs.

-- 1. Profiles are the tenant-context root for many policies. A regular
-- authenticated client may manage display/contact fields only; tenant binding
-- and privileged flags must be assigned by service-role flows/RPCs.
create or replace function public.fn_protect_profile_security_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.tenant_id is not null then
      raise exception 'tenant_id cannot be set from the client'
        using errcode = '42501';
    end if;

    if coalesce(new.is_super_admin, false) then
      raise exception 'is_super_admin cannot be set from the client'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id cannot be changed from the client'
      using errcode = '42501';
  end if;

  if new.is_super_admin is distinct from old.is_super_admin then
    raise exception 'is_super_admin cannot be changed from the client'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_security_fields on public.profiles;
create trigger trg_protect_profile_security_fields
before insert or update on public.profiles
for each row execute function public.fn_protect_profile_security_fields();

create or replace function public.create_profile_if_missing(
  p_user_id uuid,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'cannot create profile for another user'
      using errcode = '42501';
  end if;

  insert into public.profiles (id, email, created_at, updated_at)
  values (
    p_user_id,
    coalesce(p_email, (select email from auth.users where id = p_user_id)),
    now(),
    now()
  )
  on conflict (id) do nothing;
end;
$$;

-- 2. Booking state RPCs must not bypass tenant ownership.
create or replace function public.fn_start_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set started_at = now(),
      status = 'in_progress'
  where id = p_booking_id
    and started_at is null
    and public.check_tenant_access(tenant_id);

  if not found then
    raise exception 'booking not found or access denied'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.fn_complete_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set completed_at = now(),
      status = 'completed'
  where id = p_booking_id
    and completed_at is null
    and public.check_tenant_access(tenant_id);

  if not found then
    raise exception 'booking not found or access denied'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.fn_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set cancelled_at = now(),
      status = 'cancelled'
  where id = p_booking_id
    and cancelled_at is null
    and public.check_tenant_access(tenant_id);

  if not found then
    raise exception 'booking not found or access denied'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.fn_get_booking_stats_admin(p_tenant_id uuid)
returns table(
  today_total bigint,
  today_started bigint,
  today_completed bigint,
  today_cancelled bigint,
  upcoming_count bigint,
  in_progress_count bigint,
  total_completed bigint,
  today_revenue numeric,
  total_revenue numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_tenant_access(p_tenant_id) then
    raise exception 'tenant access denied'
      using errcode = '42501';
  end if;

  return query
  select
    count(*) filter (where date(start_time) = current_date) as today_total,
    count(*) filter (where date(start_time) = current_date and started_at is not null) as today_started,
    count(*) filter (where date(start_time) = current_date and completed_at is not null) as today_completed,
    count(*) filter (where date(start_time) = current_date and cancelled_at is not null) as today_cancelled,
    count(*) filter (where start_time > now() and cancelled_at is null) as upcoming_count,
    count(*) filter (where started_at is not null and completed_at is null and cancelled_at is null) as in_progress_count,
    count(*) filter (where completed_at is not null) as total_completed,
    coalesce(sum(total_price) filter (where date(start_time) = current_date and status in ('paid', 'completed')), 0) as today_revenue,
    coalesce(sum(total_price) filter (where completed_at is not null), 0) as total_revenue
  from public.bookings
  where tenant_id = p_tenant_id;
end;
$$;

create or replace function public.can_extend_trial(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not (public.check_tenant_access(p_tenant_id) or public.fn_is_saas_admin()) then false
    else coalesce((
      select coalesce(trial_extension_days, 0) < 7
      from public.tenant_subscriptions
      where tenant_id = p_tenant_id
        and status = 'trial'
      order by created_at desc
      limit 1
    ), false)
  end;
$$;

-- 3. Remove broad/public execution and grant back only the intended API surface.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on function public.create_profile_if_missing(uuid, text) to authenticated;
grant execute on function public.fn_onboard_user(text, text) to authenticated;
grant execute on function public.fn_update_my_tenant_hours(integer, integer, integer, integer) to authenticated;
grant execute on function public.fn_start_booking(uuid) to authenticated;
grant execute on function public.fn_complete_booking(uuid) to authenticated;
grant execute on function public.fn_cancel_booking(uuid) to authenticated;
grant execute on function public.fn_get_booking_stats_admin(uuid) to authenticated;
grant execute on function public.can_extend_trial(uuid) to authenticated;

grant execute on function public.check_tenant_access(uuid) to authenticated;
grant execute on function public.fn_is_tenant_owner(uuid) to authenticated;
grant execute on function public.is_tenant_owner(uuid) to authenticated;
grant execute on function public.fn_is_saas_admin() to authenticated;

grant execute on function public.fn_public_get_tenant_by_subdomain(text) to anon, authenticated;
grant execute on function public.fn_public_get_occupied_slots(text, date) to anon, authenticated;
grant execute on function public.fn_public_get_booking_stats(text) to anon, authenticated;
grant execute on function public.fn_can_insert_public_booking(uuid, uuid, text, text, text, timestamp with time zone, timestamp with time zone, numeric) to anon, authenticated;
grant execute on function public.fn_is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.fn_is_active_court_for_tenant(uuid, uuid) to anon, authenticated;
grant execute on function public.is_public_tenant(uuid) to anon, authenticated;
grant execute on function public.is_active_court_for_tenant(uuid, uuid) to anon, authenticated;
grant execute on function public.fn_default_saas_product_id() to anon, authenticated;
grant execute on function public.get_founders_progress() to anon, authenticated;

grant execute on function public.check_and_mark_founder(uuid) to service_role;
grant execute on function public.cleanup_old_webhook_events() to service_role;
grant execute on function public.create_trial_subscription(uuid, integer) to service_role;
grant execute on function public.extend_trial(uuid, integer) to service_role;
grant execute on function public.fix_missing_profiles() to service_role;

-- Trigger/helper functions should not be callable through PostgREST RPC.
revoke execute on function public.fn_protect_profile_security_fields() from public, anon, authenticated;
revoke execute on function public.fn_init_tenant_subscription() from public, anon, authenticated;
revoke execute on function public.fn_init_trial_subscription() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.trg_log_booking_event() from public, anon, authenticated;

-- 4. Legacy views should not be an alternate public route around RPCs/policies.
revoke all on public.public_bookings_view from anon, authenticated;
revoke all on public.trial_ab_analytics from anon, authenticated;
revoke select on public.v_booking_stats from anon;

-- 5. Avoid public listing of all avatar object names. Public URLs remain usable
-- for known object paths in a public bucket.
drop policy if exists "Public View" on storage.objects;
