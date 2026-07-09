# Billing Operations - ArenaSys

Este documento define como operar billing do ArenaSys em escala de 500 arenas.
O objetivo e responder rapidamente:

- webhook parou?
- Edge Function quebrou?
- pagamento ficou preso?
- assinatura nao ativou?
- tenant ficou bloqueado?
- webhook duplicou?
- houve erro de cobranca?

## Fontes de sinal

### Banco

Views operacionais criadas pela migration:

```sql
select * from public.billing_ops_health_summary;
select * from public.billing_ops_alerts order by severity, alert_key;
select * from public.billing_ops_tenant_risks order by severity, last_changed_at;
select * from public.billing_ops_recent_events;
```

Tabelas usadas:

- `asaas_webhook_events`: idempotencia, status do processamento do webhook.
- `tenant_subscriptions`: estado local da assinatura e acesso do tenant.
- `billing_operational_events`: eventos estruturados de checkout, webhook e
  reconciliacao.

### GitHub Actions

Workflow:

```text
.github/workflows/billing-operational-monitor.yml
```

Agenda: a cada 15 minutos.

Comando executado:

```bash
npm run check:billing-ops
```

Secrets necessarios:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

O workflow falha quando existe alerta `critical` ou `high`.

## Dashboards

### Resumo executivo

Use:

```sql
select * from public.billing_ops_health_summary;
```

Campos principais:

- `last_real_webhook_at`: ultimo webhook real recebido do Asaas.
- `last_reconciliation_at`: ultima execucao finalizada da reconciliacao.
- `failed_webhooks_24h`: webhooks que falharam nas ultimas 24h.
- `stuck_processing_webhooks`: webhooks presos em `processing` por mais de 15m.
- `billing_errors_1h`: erros operacionais em billing na ultima hora.
- `duplicate_webhooks_1h`: duplicidades ignoradas na ultima hora.
- `ignored_webhooks_1h`: eventos ignorados na ultima hora.
- `payment_stuck_count`: assinaturas com ID Asaas ainda em `trial` apos 30m.
- `blocked_or_expired_tenants`: tenants em atraso, cancelados ou trial expirado.

### Alertas ativos

Use:

```sql
select * from public.billing_ops_alerts;
```

Se esta view retornar linhas, existe acao operacional pendente.

### Fila por tenant

Use:

```sql
select * from public.billing_ops_tenant_risks;
```

Esta e a fila de customer success/operacao. Ela mostra qual tenant precisa ser
avaliado e por qual motivo.

## Alertas e metricas

### Webhook parado

Alerta: `webhook_stopped`

Regra:

```text
last_real_webhook_at < now() - 2 hours
```

Se disparar:

1. Verificar se o webhook esta ativo no painel do Asaas.
2. Confirmar URL: `https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook`.
3. Conferir se o token cadastrado no Asaas bate com `ASAAS_WEBHOOK_SECRET`.
4. Executar reconciliacao manual para cobrir eventos perdidos.

### Edge Function quebrada

Alertas:

- `reconciliation_stopped`
- `billing_function_errors`

Regra:

```text
last_reconciliation_at < now() - 45 minutes
billing_errors_1h > 0
```

Se disparar:

1. Abrir o run do GitHub Actions `Billing Reconciliation`.
2. Abrir logs das Edge Functions no Supabase.
3. Procurar por `request_id` e `correlation_id`.
4. Conferir `billing_ops_recent_events` para saber qual funcao falhou.

### Pagamento preso

Alerta: `payment_stuck`

Regra:

```text
asaas_subscription_id is not null
status = trial
updated_at < now() - 30 minutes
```

Se disparar:

1. Consultar `billing_ops_tenant_risks` com `issue_key = 'payment_stuck'`.
2. Conferir a assinatura no painel do Asaas.
3. Rodar reconciliacao manual.
4. Se o pagamento foi confirmado, validar se o webhook chegou ou se a
   reconciliacao corrigiu o status.

### Assinatura nao ativada

Mesmo sinal de `payment_stuck`.

Uma assinatura Asaas criada nao libera acesso sozinha. O acesso so deve mudar
quando um pagamento recebido/confirmado chega por webhook ou reconciliacao.

### Tenant bloqueado

Alerta: `tenant_blocked_or_expired`

Fila:

```sql
select *
from public.billing_ops_tenant_risks
where issue_key in ('tenant_blocked', 'trial_expired');
```

Se disparar:

1. Confirmar no painel Asaas se o status esta correto.
2. Conferir se e inadimplencia real, cancelamento real ou erro de sincronizacao.
3. Se for divergencia, rodar reconciliacao manual.

### Webhook duplicado

Alerta: `webhook_duplicate_spike`

Regra:

```text
webhook_duplicate_ignored > 20 por hora
```

Duplicidade isolada e esperada em webhooks. O problema e pico recorrente, que
pode indicar retry agressivo do Asaas ou resposta lenta da Edge Function.

Se disparar:

1. Conferir tempo de execucao nos logs estruturados.
2. Confirmar que os eventos duplicados retornaram `200`.
3. Verificar se a funcao esta demorando ou falhando antes de responder.

### Erro de cobranca

Alertas:

- `failed_webhooks`
- `billing_function_errors`
- `webhooks_stuck_processing`

Se disparar:

1. Verificar `billing_ops_recent_events`.
2. Filtrar por `subscription_id` ou `payment_id`.
3. Conferir `asaas_webhook_events.status`.
4. Rodar reconciliacao manual se o estado local estiver divergente.

## Comandos

Checar alertas localmente:

```bash
npm run check:billing-ops
```

Rodar testes de billing:

```bash
npm run test:billing
```

Rodar reconciliacao manual via GitHub Actions:

```text
Actions -> Billing Reconciliation -> Run workflow
```

## Severidade

- `critical`: risco imediato de perda de eventos ou billing parado.
- `high`: tenant ou pagamento com risco direto de acesso incorreto.
- `warning`: sinal operacional que precisa acompanhamento, mas pode ser normal
  em volume baixo.
- `info`: evento de auditoria.

## Pronto para operar

Com esta camada, o operador consegue descobrir:

- webhook parado: `billing_ops_alerts.alert_key = 'webhook_stopped'`;
- Edge Function quebrada: `reconciliation_stopped` ou `billing_function_errors`;
- pagamento preso: `payment_stuck`;
- assinatura nao ativada: `billing_ops_tenant_risks.issue_key = 'payment_stuck'`;
- tenant bloqueado: `tenant_blocked_or_expired` e `billing_ops_tenant_risks`;
- webhook duplicado: `webhook_duplicate_spike`;
- erro de cobranca: `failed_webhooks`, `webhooks_stuck_processing`,
  `billing_function_errors`.

## Riscos restantes

- GitHub Actions e Supabase SQL nao substituem uma plataforma dedicada de
  incidentes. Para producao madura, adicionar notificacao em Slack/email ou
  ferramenta como Sentry/Datadog.
- O alerta de webhook parado usa ausencia de evento real por 2 horas. Em dias
  sem movimentacao real, pode gerar falso positivo; para volume de 500 arenas,
  esse limite e aceitavel.
- `billing_operational_events` deve ter politica de retencao futura para evitar
  crescimento indefinido.
# Teste automatizado de sandbox

Use uma chave `sandbox.asaas.com` e nunca uma chave de produção:

```bash
npm run test:billing:sandbox
```

O comando valida a chave contra `/myAccount`, confirma que o webhook rejeita chamadas sem token e, quando configurados, testa o contrato autorizado do webhook e da reconciliação. Ele nunca imprime os segredos.

Variáveis necessárias: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`. Para o fluxo completo, configure também `TEST_ASAAS_WEBHOOK_TOKEN` e `BILLING_RECONCILIATION_TOKEN` (ou `ASAAS_RECONCILIATION_TOKEN`). Sem esses tokens o resultado é `BLOCKED`, não `PASS`.

O teste de checkout que cria cobrança real no sandbox deve ser executado manualmente após o preflight, com uma conta de teste e limpeza garantida; não o coloque em um job automático de cada PR.
