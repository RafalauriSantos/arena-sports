-- Include paid_amount/deposit_percent in booking audit trail

begin;

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
      'total_price', new.total_price,
      'paid_amount', new.paid_amount,
      'deposit_percent', new.deposit_percent
    );
  elsif tg_op = 'UPDATE' then
    v_tenant_id := coalesce(new.tenant_id, old.tenant_id);
    v_booking_id := coalesce(new.id, old.id);
    v_old := jsonb_build_object(
      'court_id', old.court_id,
      'start_time', old.start_time,
      'end_time', old.end_time,
      'status', old.status,
      'total_price', old.total_price,
      'paid_amount', old.paid_amount,
      'deposit_percent', old.deposit_percent
    );
    v_new := jsonb_build_object(
      'court_id', new.court_id,
      'start_time', new.start_time,
      'end_time', new.end_time,
      'status', new.status,
      'total_price', new.total_price,
      'paid_amount', new.paid_amount,
      'deposit_percent', new.deposit_percent
    );
  elsif tg_op = 'DELETE' then
    v_tenant_id := old.tenant_id;
    v_booking_id := old.id;
    v_old := jsonb_build_object(
      'court_id', old.court_id,
      'start_time', old.start_time,
      'end_time', old.end_time,
      'status', old.status,
      'total_price', old.total_price,
      'paid_amount', old.paid_amount,
      'deposit_percent', old.deposit_percent
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

commit;
