-- Prevent double-booking (professional-grade integrity)
--
-- Goal: guarantee (at DB-level) that two active bookings cannot overlap
-- for the same tenant + court, even under concurrency.
--
-- Active = status in ('pending','paid') (MVP scope)

begin;

-- Needed so GiST can compare equality for uuid/text/etc.
create extension if not exists btree_gist;

-- Fail fast if there are already overlapping active bookings (migration would fail anyway,
-- but this gives a clearer error message).
do $$
declare
  r record;
begin
  select
    b1.tenant_id,
    b1.court_id,
    b1.id as booking1_id,
    b2.id as booking2_id,
    b1.start_time as booking1_start,
    b1.end_time as booking1_end,
    b2.start_time as booking2_start,
    b2.end_time as booking2_end,
    b1.status as booking1_status,
    b2.status as booking2_status
  into r
  from public.bookings b1
  join public.bookings b2
    on b1.tenant_id = b2.tenant_id
   and b1.court_id = b2.court_id
   and b1.id < b2.id
   and coalesce(b1.status,'pending') in ('pending','paid')
   and coalesce(b2.status,'pending') in ('pending','paid')
   and (b1.start_time, b1.end_time) overlaps (b2.start_time, b2.end_time)
  limit 1;

  if found then
    raise exception using
      message = format(
        'Cannot add anti-overlap constraint: existing overlapping bookings detected. Example conflict: tenant_id=%s court_id=%s booking1=%s [%s..%s] (%s) booking2=%s [%s..%s] (%s). Resolve this overlap first.',
        r.tenant_id,
        r.court_id,
        r.booking1_id,
        r.booking1_start,
        r.booking1_end,
        r.booking1_status,
        r.booking2_id,
        r.booking2_start,
        r.booking2_end,
        r.booking2_status
      ),
      errcode = 'P0001';
  end if;
end $$;

-- Exclusion constraint: no overlapping time ranges for the same tenant + court
alter table public.bookings
  add constraint bookings_no_overlap_active
  exclude using gist (
    tenant_id with =,
    court_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (
    tenant_id is not null
    and court_id is not null
    and coalesce(status,'pending') in ('pending','paid')
  );

commit;
