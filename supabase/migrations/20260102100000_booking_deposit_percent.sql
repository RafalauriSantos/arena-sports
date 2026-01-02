-- Add deposit-by-percent support for bookings (paid partial)

begin;

-- Store partial payments safely
alter table public.bookings
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists deposit_percent numeric;

-- Backfill: if a booking is marked paid, consider it fully paid
update public.bookings
set paid_amount = total_price
where status = 'paid' and paid_amount = 0;

-- Guards
alter table public.bookings
  add constraint bookings_paid_amount_nonnegative
    check (paid_amount >= 0) not valid,
  add constraint bookings_paid_amount_lte_total
    check (paid_amount <= total_price) not valid,
  add constraint bookings_deposit_percent_range
    check (deposit_percent is null or (deposit_percent > 0 and deposit_percent <= 100)) not valid;

-- Validate after backfill
alter table public.bookings validate constraint bookings_paid_amount_nonnegative;
alter table public.bookings validate constraint bookings_paid_amount_lte_total;
alter table public.bookings validate constraint bookings_deposit_percent_range;

commit;
