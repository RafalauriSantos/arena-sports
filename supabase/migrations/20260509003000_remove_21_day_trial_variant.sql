-- Remove a antiga variante de trial e mantém apenas o padrão de 7 dias.

update public.tenant_subscriptions
set trial_variant = 'test_7d'
where trial_variant is not null
	and trial_variant not in ('test_7d', 'legacy');

alter table public.tenant_subscriptions
	drop constraint if exists tenant_subscriptions_trial_variant_check;

alter table public.tenant_subscriptions
	add constraint tenant_subscriptions_trial_variant_check
	check (trial_variant in ('test_7d', 'legacy'));

alter table public.tenant_subscriptions
	alter column trial_variant set default 'test_7d';

comment on column public.tenant_subscriptions.trial_variant is
	'Grupo do trial: test_7d (7 dias), legacy (antes da padronização).';
