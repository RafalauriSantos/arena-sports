-- Migration: Preencher email do tenant automaticamente no onboarding
-- Data: 2025-01-12
-- Descrição: Atualiza fn_onboard_user para preencher o email do usuário no tenant

-- Atualizar função de onboarding para incluir email
drop function if exists public.fn_onboard_user(text, text);
create or replace function public.fn_onboard_user(p_business_name text, p_saas_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_saas_id uuid;
  v_subdomain text;
  v_user_email text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  -- 1. Garante Profile e obtém email do usuário
  select email into v_user_email from auth.users where id = v_user_id;
  insert into public.profiles (id, email) 
  values (v_user_id, v_user_email) 
  on conflict (id) do nothing;

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
  
  -- 5. Cria Tenant COM EMAIL DO USUÁRIO
  insert into public.tenants (owner_id, business_name, subdomain, saas_id, email)
  values (v_user_id, p_business_name, v_subdomain, v_saas_id, v_user_email)
  returning id into v_tenant_id;

  -- 6. Atualiza Profile
  update public.profiles set tenant_id = v_tenant_id where id = v_user_id;

  return v_tenant_id;
end;
$$;
