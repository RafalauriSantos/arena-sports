# Billing Migration Drift

Status: histórico reconciliado para as versões locais equivalentes; os
timestamps gerados pelo MCP continuam registrados como versões remotas
equivalentes.

Projeto remoto: `extkyeckajhcozjervyr`

## Evidência atual

`npx supabase migration list` e `supabase_list_migrations` mostram que o
histórico remoto não é idêntico ao diretório `supabase/migrations`.

Migrations remotas que não possuem arquivo local com o mesmo timestamp:

- `20260509031623_grant_v_booking_stats_service_role`
- `20260705211644_harden_public_booking_reads`
- `20260707210647_production_readiness_p0_hardening`
- `20260709230041_billing_checkout_idempotency`
- `20260709230129_repair_trial_functions_live_schema`

Migrations locais que precisaram de `migration repair` depois de a equivalência
do schema/SQL ter sido comprovada:

- `20260509000000_grant_v_booking_stats_service_role.sql`
- `20260509001000_optimize_public_occupied_slots.sql`
- `20260509002000_enforce_7_day_trial.sql`
- `20260509003000_remove_21_day_trial_variant.sql`
- `20260705000001_harden_rls_tenant_isolation.sql`
- `20260705000002_harden_public_booking_reads.sql`
- `20260707000001_production_readiness_p0_hardening.sql`

## Correções aplicadas

- `billing_checkout_idempotency` foi aplicado no remoto e possui espelho local
  em `20260709000001_billing_checkout_idempotency.sql`.
- `repair_trial_functions_live_schema` foi aplicado no remoto e possui espelho
  local em `20260709000002_repair_trial_functions_live_schema.sql`.
- O trigger de trial foi corrigido para o preço atual de `6990` centavos em
  `20260709000003_fix_trial_trigger_offer.sql`.
- As versões locais equivalentes a `grant_v_booking_stats_service_role`,
  `optimize_public_occupied_slots`, `enforce_7_day_trial`, a remoção da
  variante de 21 dias, RLS/P0 e as três migrations de 09/07 foram marcadas como
  aplicadas somente depois da execução/validação equivalente no remoto.
- `npx supabase db lint --linked` deixou de reportar erros em `public`.

## Regra de reconciliação

Não usar `supabase migration repair` apenas para fazer a lista ficar verde.
Cada versão local pendente deve ser comparada ao SQL remoto ou substituída por
uma migration compatível, executada em ambiente controlado e validada por
`db lint`, catálogo de tabelas/funções e testes de runtime.
