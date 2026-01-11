begin;

-- ==============================================================================
-- 1. FUNÇÕES HELPER
-- ==============================================================================

-- Verifica se usuário é admin da plataforma (Suporte)
create or replace function public.fn_is_saas_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.saas_admin_users a where a.user_id = auth.uid());
$$;

-- Verifica acesso ao tenant (Paywall + Trial + Admin)
create or replace function public.fn_tenant_has_access(p_tenant_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  s public.tenant_subscriptions%rowtype;
  v_trial_ends timestamptz;
begin
  if p_tenant_id is null then return false; end if;
  if public.fn_is_saas_admin() then return true; end if; -- Admin entra sempre

  select * into s from public.tenant_subscriptions where tenant_id = p_tenant_id;

  if not found then
    -- Fallback: Se não tem assinatura, verifica se o tenant é novo (< 21 dias)
    return (select created_at + interval '21 days' > now() from public.tenants where id = p_tenant_id);
  end if;

  if s.status = 'active' then return true; end if;
  
  if s.status = 'trial' then
    if s.trial_started_at is null then return false; end if;
    v_trial_ends := coalesce(s.trial_ends_at, s.trial_started_at + interval '21 days');
    return v_trial_ends > now();
  end if;

  if s.status = 'past_due' then
    return coalesce(s.grace_ends_at, now()) > now();
  end if;

  return false;
end $$;

-- Verifica se é dono do tenant (Usado no RLS)
create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = auth.uid());
$$;

-- Helper para produto padrão
create or replace function public.fn_default_saas_product_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.saas_products where slug = 'arena-sports' order by active desc nulls last, created_at desc nulls last limit 1;
$$;

-- Helper para criar perfis faltantes (Manutenção)
create or replace function public.fix_missing_profiles()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  select au.id, au.email, au.created_at, now()
  from auth.users au left join public.profiles p on p.id = au.id
  where p.id is null
  on conflict (id) do nothing;
end;
$$;

-- Validação de Telefone (WhatsApp)
create or replace function public.fn_bookings_require_customer_phone()
returns trigger language plpgsql as $$
begin
  if new.customer_phone is null or new.customer_phone !~ '^[0-9]{10,11}$' then
    raise exception using errcode = '23514', message = 'Telefone obrigatório (DDD + número, apenas dígitos).';
  end if;
  return new;
end;
$$;

-- Inicializa assinatura Trial ao criar Tenant
create or replace function public.fn_init_tenant_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tenant_subscriptions (tenant_id, plan_code, plan_name, monthly_price, status, billing_interval, trial_ends_at, grace_ends_at)
  values (new.id, 'start', 'Arena Start', 89, 'trial', 'month', now() + interval '21 days', now() + interval '24 days')
  on conflict (tenant_id) do nothing;
  return new;
end $$;

-- Cria perfil ao cadastrar usuário (Auth Trigger)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do nothing;
  return new;
exception when others then
  return new; -- Evita bloquear o signup se der erro no profile
end;
$$;

-- ==============================================================================
-- 2. FUNÇÕES RPC (ONBOARDING & CALENDÁRIO)
-- ==============================================================================

-- RPC Onboarding (Cria Tenant e Vincula Usuário)
drop function if exists public.fn_onboard_user(text, text);
create or replace function public.fn_onboard_user(p_business_name text, p_saas_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_saas_id uuid;
  v_subdomain text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  -- 1. Garante Profile
  insert into public.profiles (id, email) values (v_user_id, (select email from auth.users where id = v_user_id)) on conflict (id) do nothing;

  -- 2. Se já tem tenant, retorna ele
  select tenant_id into v_tenant_id from public.profiles where id = v_user_id;
  if v_tenant_id is not null then return v_tenant_id; end if;

  -- 3. Resolve SaaS ID
  select id into v_saas_id from public.saas_products where slug = p_saas_slug limit 1;
  if v_saas_id is null then 
    -- Fallback se não achar o slug
    select id into v_saas_id from public.saas_products limit 1; 
  end if;

  -- 4. Gera Subdomínio Único
  v_subdomain := lower(regexp_replace(p_business_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || left(v_user_id::text, 4);
  
  -- 5. Cria Tenant
  insert into public.tenants (owner_id, business_name, subdomain, saas_id)
  values (v_user_id, p_business_name, v_subdomain, v_saas_id)
  returning id into v_tenant_id;

  -- 6. Atualiza Profile
  update public.profiles set tenant_id = v_tenant_id where id = v_user_id;

  return v_tenant_id;
end;
$$;

-- RPC Calendário Público (Com Paywall Check)
drop function if exists public.fn_public_get_occupied_slots(text, date);
create or replace function public.fn_public_get_occupied_slots(p_subdomain text, p_date date)
returns table (court_id uuid, slot_time time)
language sql stable security definer set search_path = public as $$
  with t as (
    select id as tenant_id from public.tenants
    where subdomain = p_subdomain and subdomain is not null
    and public.fn_tenant_has_access(id) -- O Paywall Check
    limit 1
  ),
  booking_occ as (
    select b.court_id, (b.start_time at time zone 'America/Sao_Paulo')::time as slot_time
    from public.bookings b join t on t.tenant_id = b.tenant_id
    where (b.start_time at time zone 'America/Sao_Paulo')::date = p_date
      and coalesce(b.status, 'pending') in ('pending', 'paid') and b.court_id is not null
  ),
  recurring_occ as (
    select r.court_id, r.start_time::time as slot_time
    from public.recurring_slots r join t on t.tenant_id = r.tenant_id
    where r.active = true and r.day_of_week = extract(dow from p_date)::int and r.court_id is not null
  )
  select * from booking_occ union select * from recurring_occ;
$$;

-- RPC Progresso Fundadores
drop function if exists public.get_founders_progress();
create or replace function public.get_founders_progress()
returns table (cap integer, sold integer, remaining integer)
language sql stable security definer set search_path = public as $$
  select 
    100::int as cap,
    count(*)::int as sold,
    (100 - count(*))::int as remaining
  from public.tenant_subscriptions
  where plan_code = 'pro' and status = 'active' and billing_interval = 'year';
$$;

-- ==============================================================================
-- 3. TRIGGERS
-- ==============================================================================

-- Função de Auditoria (Definição Única)
create or replace function public.trg_log_booking_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid; v_booking_id uuid; v_actor uuid; v_old jsonb; v_new jsonb;
begin
  v_actor := auth.uid();
  if tg_op = 'INSERT' then
    v_tenant_id := new.tenant_id; v_booking_id := new.id; v_old := null;
    v_new := jsonb_build_object('court_id', new.court_id, 'start_time', new.start_time, 'status', new.status, 'paid_amount', new.paid_amount);
  elsif tg_op = 'UPDATE' then
    v_tenant_id := coalesce(new.tenant_id, old.tenant_id); v_booking_id := coalesce(new.id, old.id);
    v_old := jsonb_build_object('court_id', old.court_id, 'start_time', old.start_time, 'status', old.status, 'paid_amount', old.paid_amount);
    v_new := jsonb_build_object('court_id', new.court_id, 'start_time', new.start_time, 'status', new.status, 'paid_amount', new.paid_amount);
  elsif tg_op = 'DELETE' then
    v_tenant_id := old.tenant_id; v_booking_id := old.id;
    v_old := jsonb_build_object('court_id', old.court_id, 'start_time', old.start_time, 'status', old.status, 'paid_amount', old.paid_amount);
    v_new := null;
  end if;
  insert into public.booking_events (tenant_id, booking_id, actor_user_id, action, old_data, new_data)
  values (v_tenant_id, v_booking_id, v_actor, tg_op, v_old, v_new);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Aplicação dos Triggers
drop trigger if exists booking_audit_trail on public.bookings;
create trigger booking_audit_trail after insert or update or delete on public.bookings for each row execute function public.trg_log_booking_event();

drop trigger if exists trg_init_tenant_subscription on public.tenants;
create trigger trg_init_tenant_subscription after insert on public.tenants for each row execute function public.fn_init_tenant_subscription();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists trg_bookings_require_customer_phone on public.bookings;
create trigger trg_bookings_require_customer_phone before insert or update of customer_phone on public.bookings for each row execute function public.fn_bookings_require_customer_phone();

-- ==============================================================================
-- 4. GRANTS (Permissões de Execução)
-- ==============================================================================

grant execute on function public.fn_tenant_has_access(uuid) to authenticated, anon;
grant execute on function public.fn_is_saas_admin() to authenticated, anon;
grant execute on function public.is_tenant_owner(uuid) to authenticated, anon;
grant execute on function public.fn_default_saas_product_id() to authenticated, anon;
grant execute on function public.fix_missing_profiles() to authenticated;
grant execute on function public.fn_bookings_require_customer_phone() to authenticated;
grant execute on function public.fn_init_tenant_subscription() to authenticated;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.fn_onboard_user(text, text) to authenticated;
grant execute on function public.fn_public_get_occupied_slots(text, date) to authenticated, anon;
grant execute on function public.get_founders_progress() to authenticated, anon;
grant execute on function public.trg_log_booking_event() to authenticated;

commit;