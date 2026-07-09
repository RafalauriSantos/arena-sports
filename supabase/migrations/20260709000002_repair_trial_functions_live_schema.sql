-- The live tenant_subscriptions table uses tenant_id as its primary key.
-- Keep these support functions compatible with that deployed schema.
create or replace function public.create_trial_subscription(
  p_tenant_id uuid,
  p_trial_days integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final_trial_days integer := coalesce(p_trial_days, 7);
begin
  if v_final_trial_days <= 0 then
    raise exception 'Trial duration must be positive';
  end if;

  insert into public.tenant_subscriptions (
    tenant_id, plan_name, plan_code, status, trial_started_at,
    trial_ends_at, trial_variant, monthly_price, billing_interval
  ) values (
    p_tenant_id,
    'Trial do Plano Pro (' || v_final_trial_days || ' dias)',
    'trial',
    'trial',
    now(),
    now() + (v_final_trial_days || ' days')::interval,
    case when v_final_trial_days = 7 then 'test_7d' else 'legacy' end,
    0,
    'month'
  )
  on conflict (tenant_id) do update set
    plan_name = excluded.plan_name,
    plan_code = excluded.plan_code,
    status = excluded.status,
    trial_started_at = excluded.trial_started_at,
    trial_ends_at = excluded.trial_ends_at,
    trial_variant = excluded.trial_variant,
    updated_at = now();

  return p_tenant_id;
end;
$$;

create or replace function public.extend_trial(
  p_tenant_id uuid,
  p_extension_days integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_end timestamptz;
  v_total_extended integer;
  v_max_extension integer := 7;
begin
  select trial_ends_at, coalesce(trial_extension_days, 0)
    into v_current_end, v_total_extended
  from public.tenant_subscriptions
  where tenant_id = p_tenant_id and status = 'trial'
  for update;

  if v_current_end is null then
    return jsonb_build_object('success', false, 'error', 'Trial não encontrado ou não está ativo');
  end if;
  if p_extension_days <= 0 then
    return jsonb_build_object('success', false, 'error', 'Extensão deve ser maior que 0 dias');
  end if;
  if v_total_extended + p_extension_days > v_max_extension then
    return jsonb_build_object(
      'success', false,
      'error', format('Máximo de %s dias de extensão já atingido (usado: %s dias)', v_max_extension, v_total_extended),
      'max_extension', v_max_extension,
      'already_extended', v_total_extended
    );
  end if;

  update public.tenant_subscriptions
  set trial_ends_at = v_current_end + (p_extension_days || ' days')::interval,
      trial_extended_at = now(),
      trial_extension_days = v_total_extended + p_extension_days,
      updated_at = now()
  where tenant_id = p_tenant_id;

  return jsonb_build_object(
    'success', true,
    'message', format('Trial estendido por %s dias', p_extension_days),
    'old_end_date', v_current_end,
    'new_end_date', v_current_end + (p_extension_days || ' days')::interval,
    'total_extended_days', v_total_extended + p_extension_days,
    'remaining_extensions', v_max_extension - (v_total_extended + p_extension_days)
  );
end;
$$;
