-- Allow tenant members to read booking events (fix 403 in admin UI)

begin;

-- Ensure API role can read the table (RLS still applies)
grant select on table public.booking_events to authenticated;

-- Replace owner-only policy with tenant-members policy
-- (Admin users may not be marked as "owner" in is_tenant_owner())
drop policy if exists "tenant owner can read booking events" on public.booking_events;

create policy "tenant members can read booking events"
  on public.booking_events
  for select
  using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = auth.uid())
  );

commit;
