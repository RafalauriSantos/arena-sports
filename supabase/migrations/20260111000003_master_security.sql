begin;

-- ==============================================================================
-- 1. FUNÇÕES DE SEGURANÇA RLS
-- ==============================================================================

-- Função centralizada para verificar acesso ao tenant (Usada em Bookings, Courts, etc)
-- ATENÇÃO: NÃO usar na tabela 'tenants' para evitar recursão.
create or replace function public.check_tenant_access(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.owner_id = auth.uid()
  );
$$;

-- ==============================================================================
-- 2. HABILITAR RLS EM TODAS AS TABELAS
-- ==============================================================================

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.bookings enable row level security;
alter table public.recurring_slots enable row level security;
alter table public.booking_events enable row level security;
alter table public.promotion_rules enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.saas_products enable row level security;
alter table public.saas_admin_users enable row level security;
alter table public.asaas_webhook_events enable row level security;
alter table public.webhook_events enable row level security;

-- ==============================================================================
-- 3. POLÍTICAS RLS (CORRIGIDAS)
-- ==============================================================================

-- --- SAAS_PRODUCTS ---
drop policy if exists saas_products_select_policy on public.saas_products;
create policy saas_products_select_policy on public.saas_products for select to authenticated, anon using (true);

-- --- SAAS_ADMIN_USERS ---
drop policy if exists saas_admin_users_self_select on public.saas_admin_users;
create policy saas_admin_users_self_select on public.saas_admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists saas_admin_users_service_all on public.saas_admin_users;
create policy saas_admin_users_service_all on public.saas_admin_users for all to service_role using (true) with check (true);

-- --- TENANTS (A CORREÇÃO DO LOOP INFINITO ESTÁ AQUI) ---
drop policy if exists tenants_public_read_by_subdomain on public.tenants;
create policy tenants_public_read_by_subdomain on public.tenants for select to anon using (subdomain is not null);

drop policy if exists tenants_access_policy on public.tenants;
-- REGRA SIMPLIFICADA: Checa apenas se é o dono. Removemos a chamada de função recursiva.
create policy tenants_access_policy on public.tenants for all to authenticated using (
    owner_id = auth.uid()
);

-- --- PROFILES ---
drop policy if exists profiles_self_access on public.profiles;
create policy profiles_self_access on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- --- COURTS ---
drop policy if exists courts_public_read_active on public.courts;
create policy courts_public_read_active on public.courts for select to anon using (
  active = true and exists (select 1 from public.tenants t where t.id = courts.tenant_id and t.subdomain is not null)
);

drop policy if exists courts_owner_all on public.courts;
create policy courts_owner_all on public.courts for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists courts_service_all on public.courts;
create policy courts_service_all on public.courts for all to service_role using (true) with check (true);

-- --- BOOKINGS ---
drop policy if exists bookings_owner_all on public.bookings;
create policy bookings_owner_all on public.bookings for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings for all to service_role using (true) with check (true);

-- --- RECURRING_SLOTS ---
drop policy if exists recurring_slots_owner_all on public.recurring_slots;
create policy recurring_slots_owner_all on public.recurring_slots for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists recurring_slots_service_all on public.recurring_slots;
create policy recurring_slots_service_all on public.recurring_slots for all to service_role using (true) with check (true);

-- --- BOOKING_EVENTS (Auditoria) ---
drop policy if exists booking_events_tenant_members on public.booking_events;
create policy booking_events_tenant_members on public.booking_events for select 
using (public.check_tenant_access(tenant_id));

-- --- PROMOTION_RULES ---
drop policy if exists promotion_rules_owner_all on public.promotion_rules;
create policy promotion_rules_owner_all on public.promotion_rules for all to authenticated 
using (public.check_tenant_access(tenant_id)) 
with check (public.check_tenant_access(tenant_id));

drop policy if exists promotion_rules_service_all on public.promotion_rules;
create policy promotion_rules_service_all on public.promotion_rules for all to service_role using (true) with check (true);

-- --- TENANT_SUBSCRIPTIONS ---
drop policy if exists tenant_subscriptions_tenant_select on public.tenant_subscriptions;
create policy tenant_subscriptions_tenant_select on public.tenant_subscriptions for select to authenticated using (
  (select public.fn_is_saas_admin()) OR public.check_tenant_access(tenant_id)
);

drop policy if exists tenant_subscriptions_service_all on public.tenant_subscriptions;
create policy tenant_subscriptions_service_all on public.tenant_subscriptions for all to service_role using (true) with check (true);

-- --- ASAAS_WEBHOOK_EVENTS ---
drop policy if exists asaas_webhook_events_saas_admin_select on public.asaas_webhook_events;
create policy asaas_webhook_events_saas_admin_select on public.asaas_webhook_events for select to authenticated using (public.fn_is_saas_admin());

drop policy if exists asaas_webhook_events_service_all on public.asaas_webhook_events;
create policy asaas_webhook_events_service_all on public.asaas_webhook_events for all to service_role using (true) with check (true);

-- --- WEBHOOK_EVENTS ---
drop policy if exists webhook_events_service_role_only on public.webhook_events;
create policy webhook_events_service_role_only on public.webhook_events for all to service_role using (true) with check (true);

-- ==============================================================================
-- 4. VIEWS PÚBLICAS (CORREÇÃO DO LINTER)
-- ==============================================================================

-- Remove views antigas
drop view if exists public.public_courts_view;
drop view if exists public.public_bookings_view;

-- View para quadras públicas
-- WITH (security_invoker = true) garante que a view respeite o RLS da tabela original
create or replace view public.public_courts_view with (security_invoker = true) as
select id, tenant_id, name, sports, images, active
from public.courts where active = true;

grant select on public.public_courts_view to anon, authenticated;

-- View para bookings públicas
create or replace view public.public_bookings_view with (security_invoker = true) as
select id, tenant_id, court_id, start_time, end_time, status
from public.bookings where status <> 'cancelled';

grant select on public.public_bookings_view to anon, authenticated;

-- ==============================================================================
-- 5. GRANTS PARA TABELAS E VIEWS
-- ==============================================================================

-- Grants para service_role
grant select, insert, update on table public.tenants to service_role;
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.courts to service_role;
grant select, insert, update, delete on table public.bookings to service_role;
grant select, insert, update, delete on table public.recurring_slots to service_role;
grant select, insert on table public.booking_events to service_role;
grant select, insert, update, delete on table public.promotion_rules to service_role;
grant select, insert, update on table public.tenant_subscriptions to service_role;
grant select on table public.saas_products to service_role;
grant select, insert, update on table public.saas_admin_users to service_role;
grant select, insert, update on table public.asaas_webhook_events to service_role;
grant select, insert on table public.webhook_events to service_role;

-- Grants para authenticated
grant select, insert, update, delete on table public.tenants to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.courts to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;
grant select, insert, update, delete on table public.recurring_slots to authenticated;
grant select on table public.booking_events to authenticated;
grant select, insert, update, delete on table public.promotion_rules to authenticated;
grant select on table public.tenant_subscriptions to authenticated;
grant select on table public.saas_products to authenticated, anon;
grant select on table public.saas_admin_users to authenticated;

-- Grants para anon
grant select on table public.saas_products to anon;

-- ==============================================================================
-- 6. FUNÇÃO PARA LIMPEZA DE WEBHOOKS ANTIGOS
-- ==============================================================================

create or replace function public.cleanup_old_webhook_events()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.webhook_events where created_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_old_webhook_events() to service_role;

commit;