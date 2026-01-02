-- MVP RLS policies (owner-only)
--
-- Objetivo: isolamento entre tenants desde o Dia 1, assumindo o modelo atual:
--   - 1 usuário (owner) por tenant (tenants.owner_id)
--   - profiles.id = auth.uid()
--   - tabelas de domínio possuem tenant_id
--
-- IMPORTANTE:
-- - Isso NÃO implementa multiusuário por empresa (tenant_members). É proposital (MVP).
-- - Quando você evoluir para staff/roles, troque is_tenant_owner() por checagem em tenant_members.

begin;

-- Helper: verdadeiro se o usuário logado é o dono do tenant
create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.owner_id = auth.uid()
  );
$$;

-- =========================
-- TENANTS
-- =========================
alter table public.tenants enable row level security;

-- Página pública precisa achar o tenant por subdomain.
-- Política minimalista: anon pode ler rows com subdomain preenchido.
-- (Se quiser restringir colunas, use privilégios de coluna + ajustar selects no client.)
create policy tenants_public_read_by_subdomain
on public.tenants
for select
to anon
using (subdomain is not null);

create policy tenants_owner_select
on public.tenants
for select
to authenticated
using (owner_id = auth.uid());

create policy tenants_owner_insert
on public.tenants
for insert
to authenticated
with check (owner_id = auth.uid());

create policy tenants_owner_update
on public.tenants
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- =========================
-- PROFILES
-- =========================
alter table public.profiles enable row level security;

create policy profiles_self_select
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_self_insert
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_self_update
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- =========================
-- COURTS
-- =========================
alter table public.courts enable row level security;

create policy courts_owner_select
on public.courts
for select
to authenticated
using (public.is_tenant_owner(tenant_id));

create policy courts_owner_insert
on public.courts
for insert
to authenticated
with check (public.is_tenant_owner(tenant_id));

create policy courts_owner_update
on public.courts
for update
to authenticated
using (public.is_tenant_owner(tenant_id))
with check (public.is_tenant_owner(tenant_id));

create policy courts_owner_delete
on public.courts
for delete
to authenticated
using (public.is_tenant_owner(tenant_id));

-- =========================
-- BOOKINGS
-- =========================
alter table public.bookings enable row level security;

create policy bookings_owner_select
on public.bookings
for select
to authenticated
using (public.is_tenant_owner(tenant_id));

create policy bookings_owner_insert
on public.bookings
for insert
to authenticated
with check (
  public.is_tenant_owner(tenant_id)
  and exists (
    select 1
    from public.courts c
    where c.id = court_id
      and c.tenant_id = tenant_id
  )
);

create policy bookings_owner_update
on public.bookings
for update
to authenticated
using (public.is_tenant_owner(tenant_id))
with check (public.is_tenant_owner(tenant_id));

create policy bookings_owner_delete
on public.bookings
for delete
to authenticated
using (public.is_tenant_owner(tenant_id));

-- =========================
-- RECURRING_SLOTS (mensalistas)
-- =========================
alter table public.recurring_slots enable row level security;

create policy recurring_slots_owner_select
on public.recurring_slots
for select
to authenticated
using (public.is_tenant_owner(tenant_id));

create policy recurring_slots_owner_insert
on public.recurring_slots
for insert
to authenticated
with check (
  public.is_tenant_owner(tenant_id)
  and exists (
    select 1
    from public.courts c
    where c.id = court_id
      and c.tenant_id = tenant_id
  )
);

create policy recurring_slots_owner_update
on public.recurring_slots
for update
to authenticated
using (public.is_tenant_owner(tenant_id))
with check (public.is_tenant_owner(tenant_id));

create policy recurring_slots_owner_delete
on public.recurring_slots
for delete
to authenticated
using (public.is_tenant_owner(tenant_id));

-- =========================
-- PROMOTION_RULES
-- =========================
alter table public.promotion_rules enable row level security;

create policy promotion_rules_owner_select
on public.promotion_rules
for select
to authenticated
using (public.is_tenant_owner(tenant_id));

create policy promotion_rules_owner_upsert
on public.promotion_rules
for insert
to authenticated
with check (public.is_tenant_owner(tenant_id));

create policy promotion_rules_owner_update
on public.promotion_rules
for update
to authenticated
using (public.is_tenant_owner(tenant_id))
with check (public.is_tenant_owner(tenant_id));

-- =========================
-- TENANT_SUBSCRIPTIONS
-- =========================
alter table public.tenant_subscriptions enable row level security;

-- MVP: owner pode ler o status/plan. Escrita normalmente deve ser via backend/webhook.
create policy tenant_subscriptions_owner_select
on public.tenant_subscriptions
for select
to authenticated
using (public.is_tenant_owner(tenant_id));

-- =========================
-- SAAS_PRODUCTS (catálogo)
-- =========================
-- Opcional: deixar público (sem RLS) ou habilitar RLS com select aberto.
alter table public.saas_products enable row level security;

create policy saas_products_public_read
on public.saas_products
for select
to anon, authenticated
using (true);

commit;
