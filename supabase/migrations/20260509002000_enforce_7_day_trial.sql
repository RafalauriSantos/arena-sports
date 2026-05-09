-- Enforce ArenaSys trial as 7 days everywhere going forward.

begin;

update public.tenant_subscriptions
set
	trial_ends_at = trial_started_at + interval '7 days',
	grace_ends_at = trial_started_at + interval '10 days',
	updated_at = now()
where status = 'trial'
	and trial_started_at is not null
	and (
		trial_ends_at is null
		or trial_ends_at <> trial_started_at + interval '7 days'
		or grace_ends_at is null
		or grace_ends_at <> trial_started_at + interval '10 days'
	);

update public.tenant_subscriptions
set
	trial_ends_at = null,
	grace_ends_at = null,
	updated_at = now()
where status = 'trial'
	and trial_started_at is null
	and (trial_ends_at is not null or grace_ends_at is not null);

do $$
begin
	if exists (
		select 1
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'tenant_subscriptions'
			and column_name = 'trial_variant'
	) then
		update public.tenant_subscriptions
		set trial_variant = 'test_7d'
		where status = 'trial'
			and trial_variant is distinct from 'test_7d';
	end if;
end $$;

create or replace function public.fn_tenant_has_access(p_tenant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	s public.tenant_subscriptions%rowtype;
	v_trial_ends timestamptz;
begin
	if p_tenant_id is null then return false; end if;
	if public.fn_is_saas_admin() then return true; end if;

	select * into s
	from public.tenant_subscriptions
	where tenant_id = p_tenant_id
	order by updated_at desc nulls last, created_at desc nulls last
	limit 1;

	if not found then
		return (
			select created_at + interval '7 days' > now()
			from public.tenants
			where id = p_tenant_id
		);
	end if;

	if s.status = 'active' then return true; end if;

	if s.status = 'trial' then
		if s.trial_started_at is null then return false; end if;
		v_trial_ends := coalesce(s.trial_ends_at, s.trial_started_at + interval '7 days');
		return v_trial_ends > now();
	end if;

	if s.status = 'past_due' then
		return coalesce(s.grace_ends_at, now()) > now();
	end if;

	return false;
end $$;

create or replace function public.fn_init_tenant_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.tenant_subscriptions (
		tenant_id,
		plan_code,
		plan_name,
		monthly_price,
		status,
		billing_interval,
		trial_started_at,
		trial_ends_at,
		grace_ends_at
	)
	values (
		new.id,
		'start',
		'Arena Start',
		89,
		'trial',
		'month',
		null,
		null,
		null
	)
	on conflict (tenant_id) do nothing;

	return new;
end $$;

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
	v_subscription_id uuid;
begin
	insert into public.tenant_subscriptions (
		tenant_id,
		plan_name,
		plan_code,
		status,
		trial_started_at,
		trial_ends_at,
		trial_variant,
		monthly_price,
		billing_interval
	)
	values (
		p_tenant_id,
		'Trial do Plano Pro (7 dias)',
		'trial',
		'trial',
		now(),
		now() + interval '7 days',
		'test_7d',
		0,
		'month'
	)
	returning id into v_subscription_id;

	return v_subscription_id;
end;
$$;

comment on function public.fn_tenant_has_access(uuid) is
	'Verifica acesso ao tenant considerando trial fixo de 7 dias.';

comment on function public.create_trial_subscription(uuid, integer) is
	'Cria trial fixo de 7 dias. O parametro p_trial_days e mantido apenas por compatibilidade.';

commit;
