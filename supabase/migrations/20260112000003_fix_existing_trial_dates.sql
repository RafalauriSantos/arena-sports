-- Fix: Corrigir subscriptions existentes que têm trial_ends_at mas não trial_started_at
-- Para essas subscriptions, resetar as datas e deixar null até o trial ser iniciado

update public.tenant_subscriptions
set 
  trial_started_at = null,
  trial_ends_at = null,
  grace_ends_at = null
where 
  status = 'trial'
  and trial_ends_at is not null
  and trial_started_at is null;
