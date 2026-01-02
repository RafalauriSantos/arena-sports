-- Booking audit trail (professional-grade observability)
--
-- Records who changed what and when for bookings.
-- Implemented via triggers on public.bookings.

begin;

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  booking_id uuid,
  actor_user_id uuid,
  action text not null, -- INSERT | UPDATE | DELETE
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_tenant_created_idx
  on public.booking_events (tenant_id, created_at desc);

create index if not exists booking_events_booking_created_idx
  on public.booking_events (booking_id, created_at desc);

-- Lock down reads via RLS (tenant owner only)
alter table public.booking_events enable row level security;

-- NOTE: uses profile.tenant_id as source of truth and helper is_tenant_owner(tenant_id)
-- (introduced in earlier MVP RLS migrations).
create policy "tenant owner can read booking events"
  on public.booking_events
  for select
  using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid())
    and public.is_tenant_owner(tenant_id)
  );

-- Trigger function that writes to booking_events.
-- SECURITY DEFINER so it can insert even when clients don't have insert perms on booking_events.
create or replace function public.trg_log_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_booking_id uuid;
  v_actor uuid;
  v_old jsonb;
  v_new jsonb;
begin
  v_actor := auth.uid();

  if tg_op = 'INSERT' then
    v_tenant_id := new.tenant_id;
    v_booking_id := new.id;
    v_old := null;
    v_new := jsonb_build_object(
      'court_id', new.court_id,
      'start_time', new.start_time,
      'end_time', new.end_time,
      'status', new.status,
      'total_price', new.total_price
    );
  elsif tg_op = 'UPDATE' then
    v_tenant_id := coalesce(new.tenant_id, old.tenant_id);
    v_booking_id := coalesce(new.id, old.id);
    v_old := jsonb_build_object(
      'court_id', old.court_id,
      'start_time', old.start_time,
      'end_time', old.end_time,
      'status', old.status,
      'total_price', old.total_price
    );
    v_new := jsonb_build_object(
      'court_id', new.court_id,
      'start_time', new.start_time,
      'end_time', new.end_time,
      'status', new.status,
      'total_price', new.total_price
    );
  elsif tg_op = 'DELETE' then
    v_tenant_id := old.tenant_id;
    v_booking_id := old.id;
    v_old := jsonb_build_object(
      'court_id', old.court_id,
      'start_time', old.start_time,
      'end_time', old.end_time,
      'status', old.status,
      'total_price', old.total_price
    );
    v_new := null;
  end if;

  insert into public.booking_events (
    tenant_id,
    booking_id,
    actor_user_id,
    action,
    old_data,
    new_data
  ) values (
    v_tenant_id,
    v_booking_id,
    v_actor,
    tg_op,
    v_old,
    v_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

-- Ensure the trigger function can run.
-- (Depending on your setup, migrations run as postgres, so this is usually fine.)

drop trigger if exists booking_audit_trail on public.bookings;
create trigger booking_audit_trail
after insert or update or delete on public.bookings
for each row execute function public.trg_log_booking_event();

commit;
