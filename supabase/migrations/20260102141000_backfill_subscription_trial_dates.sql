-- Backfill trial/grace timestamps for existing tenant_subscriptions rows
--
-- Problem:
-- - Older environments may already have tenant_subscriptions rows created before
--   trial_ends_at/grace_ends_at columns existed.
-- - Those rows end up with NULL timestamps, which makes both DB + frontend treat
--   access as expired immediately.
--
-- Fix:
-- - Fill NULL trial_ends_at/grace_ends_at based on created_at.
-- - Add sane defaults for future inserts.

begin;

-- Some environments created tenant_subscriptions earlier with fewer columns.
-- Ensure these exist because triggers and this backfill rely on them.
alter table public.tenant_subscriptions
  add column if not exists created_at timestamptz not null default now();

alter table public.tenant_subscriptions
  add column if not exists updated_at timestamptz not null default now();

alter table public.tenant_subscriptions
  alter column trial_ends_at set default (now() + interval '21 days');

alter table public.tenant_subscriptions
  alter column grace_ends_at set default (now() + interval '24 days');

update public.tenant_subscriptions
set
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '21 days'),
  grace_ends_at = coalesce(grace_ends_at, created_at + interval '24 days')
where trial_ends_at is null
   or grace_ends_at is null;

commit;
