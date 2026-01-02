-- Dedupe exact-duplicate active bookings (safe cleanup)
--
-- Why: To apply the anti-overlap constraint, the table must be consistent.
-- This migration only cancels *exact duplicates* (same tenant_id, court_id, start_time, end_time)
-- among active statuses ('pending','paid').
--
-- Strategy: keep the "best" row (prefer paid, then earliest created), delete the rest.

begin;

with ranked as (
  select
    id,
    row_number() over (
      partition by tenant_id, court_id, start_time, end_time
      order by
        case when status = 'paid' then 0 else 1 end,
        created_at asc nulls last,
        id asc
    ) as rn
  from public.bookings
  where tenant_id is not null
    and court_id is not null
    and start_time is not null
    and end_time is not null
    and coalesce(status,'pending') in ('pending','paid')
)
delete from public.bookings b
using ranked r
where b.id = r.id
  and r.rn > 1;

commit;
