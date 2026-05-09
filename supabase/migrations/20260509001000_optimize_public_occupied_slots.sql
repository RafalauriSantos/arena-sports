-- Optimize public slot occupancy lookup for realtime-driven public booking.
-- Keeps the same RPC signature and result shape used by the frontend.

begin;

create index if not exists idx_bookings_public_occupied_lookup
	on public.bookings (tenant_id, start_time, court_id)
	where cancelled_at is null
		and coalesce(status, 'pending') in (
			'pending',
			'paid',
			'pending_payment',
			'confirmed',
			'in_progress'
		)
		and court_id is not null;

create index if not exists idx_recurring_slots_public_occupied_lookup
	on public.recurring_slots (tenant_id, day_of_week, court_id, start_time)
	where active = true
		and court_id is not null;

drop function if exists public.fn_public_get_occupied_slots(text, date);

create or replace function public.fn_public_get_occupied_slots(
	p_subdomain text,
	p_date date
)
returns table (court_id uuid, slot_time time)
language sql
stable
security definer
set search_path = public
as $$
	with t as (
		select id as tenant_id
		from public.tenants
		where subdomain = p_subdomain
			and subdomain is not null
			and public.fn_tenant_has_access(id)
		limit 1
	),
	bounds as (
		select
			(p_date::timestamp at time zone 'America/Sao_Paulo') as start_utc,
			((p_date + 1)::timestamp at time zone 'America/Sao_Paulo') as end_utc
	),
	booking_occ as (
		select distinct
			b.court_id,
			(b.start_time at time zone 'America/Sao_Paulo')::time as slot_time
		from public.bookings b
		join t on t.tenant_id = b.tenant_id
		cross join bounds
		where b.start_time >= bounds.start_utc
			and b.start_time < bounds.end_utc
			and coalesce(b.status, 'pending') in (
				'pending',
				'paid',
				'pending_payment',
				'confirmed',
				'in_progress'
			)
			and b.court_id is not null
			and b.cancelled_at is null

		union

		select distinct
			b.court_id,
			((b.start_time at time zone 'America/Sao_Paulo') + interval '1 hour')::time as slot_time
		from public.bookings b
		join t on t.tenant_id = b.tenant_id
		cross join bounds
		where b.start_time >= bounds.start_utc
			and b.start_time < bounds.end_utc
			and coalesce(b.status, 'pending') in (
				'pending',
				'paid',
				'pending_payment',
				'confirmed',
				'in_progress'
			)
			and b.court_id is not null
			and b.cancelled_at is null
			and (b.end_time at time zone 'America/Sao_Paulo')
				> (b.start_time at time zone 'America/Sao_Paulo') + interval '1 hour'
	),
	recurring_occ as (
		select
			r.court_id,
			r.start_time::time as slot_time
		from public.recurring_slots r
		join t on t.tenant_id = r.tenant_id
		where r.active = true
			and r.day_of_week = extract(dow from p_date)::int
			and r.court_id is not null
	)
	select * from booking_occ
	union
	select * from recurring_occ;
$$;

comment on function public.fn_public_get_occupied_slots(text, date) is
	'Returns occupied public booking slots for one subdomain/date using tenant and date-range filters that can use indexes.';

grant execute on function public.fn_public_get_occupied_slots(text, date) to anon, authenticated;

commit;
