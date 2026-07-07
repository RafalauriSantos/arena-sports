# Billing Reconciliation - ArenaSys

Data: 2026-07-06

## Objetivo

Eliminar a dependência exclusiva dos webhooks do Asaas para liberar ou bloquear
acesso de donos de arena.

O webhook continua sendo o caminho principal e mais rápido. A reconciliação é o
segundo caminho operacional: periodicamente consulta o Asaas, compara com
`tenant_subscriptions` e corrige divergências.

## Arquitetura

Componentes:

- Edge Function: `asaas-reconcile-billing`
- Core testável: `supabase/functions/asaas-reconcile-billing/reconciliation-core.ts`
- Agenda: GitHub Actions em `.github/workflows/billing-reconciliation.yml`
- Fonte local: `tenant_subscriptions`
- Log/idempotência: `asaas_webhook_events`
- Fonte externa: Asaas Subscriptions e Payments API

Frequência padrão:

- a cada 30 minutos via GitHub Actions;
- execução manual via `workflow_dispatch`.

## Segurança

A função é server-to-server e exige token próprio.

Secret obrigatório na Edge Function:

```text
BILLING_RECONCILIATION_TOKEN
```

Secret obrigatório no GitHub Actions:

```text
BILLING_RECONCILIATION_TOKEN
```

URL do projeto no GitHub Actions:

```text
SUPABASE_FUNCTIONS_URL
```

ou, como fallback já usado pelo CI:

```text
VITE_SUPABASE_URL
```

Headers aceitos:

```http
x-reconciliation-token: <token>
```

ou:

```http
Authorization: Bearer <token>
```

Se o token não estiver configurado, a função retorna `503`. Se o token enviado
estiver ausente/incorreto, retorna `401`.

## Como funciona

1. Busca em `tenant_subscriptions` registros com `asaas_subscription_id`.
2. Consulta no Asaas:
   - `GET /subscriptions/{id}`
   - `GET /subscriptions/{id}/payments`
   - fallback: `GET /payments?subscription={id}`
3. Seleciona o pagamento acionável mais recente.
4. Converte o estado remoto em evento sintético idempotente:
   - `PAYMENT_RECEIVED`
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_RECEIVED_IN_CASH`
   - `PAYMENT_OVERDUE`
   - `PAYMENT_REFUNDED`
   - eventos equivalentes de chargeback/refund/dunning
   - `SUBSCRIPTION_UPDATED` para assinatura expirada/inativa/cancelada
5. Reusa o mesmo core do webhook (`processAsaasWebhookEvent`) para atualizar
   `tenant_subscriptions`.
6. Registra evento sintético em `asaas_webhook_events` com prefixo
   `reconcile:*`.
7. Emite logs estruturados com `request_id`, `correlation_id`, `trace_id`,
   `tenant_id`, `subscription_id`, `payment_id`, ação executada e duração.

## Decisões importantes

### Assinatura Asaas ACTIVE não libera acesso sozinha

Uma assinatura `ACTIVE` no Asaas significa que a recorrência está ativa, não que
a cobrança foi paga. A reconciliação só ativa acesso por pagamento recebido ou
confirmado.

### Pagamento PENDING não altera status local

Cobrança pendente não corrige trial/past_due para active. O sistema aguarda
status de pagamento recebido/confirmado.

### Expirada/inativa/cancelada bloqueia

Quando a assinatura remota está `EXPIRED`, a assinatura local vira `past_due`.
Quando está `INACTIVE`, `DELETED`, `CANCELLED` ou `CANCELED`, vira `cancelled`.

### Evento sintético duplicado ainda corrige divergência

Se o evento `reconcile:*` já estava `done`, mas o status local divergiu de novo,
a reconciliação atualiza o status local diretamente. Isso evita que uma correção
manual errada fique presa por idempotência.

## Logs estruturados

Eventos principais:

- `request_started`
- `reconciliation_auth_failed`
- `reconciliation_token_missing`
- `reconciliation_scan_started`
- `asaas_api_request_started`
- `asaas_api_request_failed`
- `asaas_subscription_payments_endpoint_failed`
- `reconciliation_action_recorded`
- `reconciliation_subscription_failed`
- `reconciliation_finished`
- `unexpected_error`

Exemplo de ação:

```json
{
  "event": "reconciliation_action_recorded",
  "function_name": "asaas-reconcile-billing",
  "tenant_id": "tenant_123",
  "subscription_id": "sub_123",
  "payment_id": "pay_123",
  "action": "divergence_corrected",
  "localStatus": "trial",
  "remoteStatus": "active",
  "source": "payment"
}
```

## Execução manual

Dry-run:

```bash
curl --fail-with-body \
  --request POST "$SUPABASE_URL/functions/v1/asaas-reconcile-billing" \
  --header "Content-Type: application/json" \
  --header "x-reconciliation-token: $BILLING_RECONCILIATION_TOKEN" \
  --data '{"dry_run":true,"limit":25}'
```

Execução real:

```bash
curl --fail-with-body \
  --request POST "$SUPABASE_URL/functions/v1/asaas-reconcile-billing" \
  --header "Content-Type: application/json" \
  --header "x-reconciliation-token: $BILLING_RECONCILIATION_TOKEN" \
  --data '{"limit":100}'
```

Resposta esperada:

```json
{
  "ok": true,
  "summary": {
    "scanned": 10,
    "already_in_sync": 8,
    "corrected": 1,
    "expired_detected": 1,
    "no_action": 0,
    "remote_missing": 0,
    "failed": 0
  }
}
```

HTTP `500` indica execução parcial ou falha inesperada: pelo menos uma
assinatura falhou e o GitHub Actions deve marcar o job como falho.

## Testes

Script:

```bash
npm run test:reconciliation
```

Também foi adicionado ao fluxo:

```bash
npm run test:billing
```

Cobertura automatizada:

- pagamento recebido ativa assinatura local em trial;
- evento sintético duplicado ainda corrige divergência local;
- pagamento vencido muda assinatura ativa para `past_due`;
- assinatura expirada é detectada e muda para `past_due`;
- pagamento pendente não libera acesso;
- assinatura remota ausente é reportada sem alteração local.

## Cenários cobertos

- Webhook de pagamento recebido perdido.
- Webhook de pagamento confirmado perdido.
- Webhook de pagamento recebido em dinheiro perdido.
- Webhook de pagamento vencido perdido.
- Webhook de reembolso/chargeback perdido.
- Evento sintético duplicado.
- Divergência local causada por atualização manual incorreta.
- Assinatura expirada no Asaas.
- Assinatura inativa/cancelada no Asaas.
- Falha parcial em uma assinatura sem interromper toda a rodada.
- Dry-run operacional.

## Cenários ainda não cobertos

- Reprocessamento automático diretamente pela tela administrativa.
- Alerta externo em Slack/e-mail quando `summary.failed > 0`.
- Reconciliação de pagamento de reservas avulsas de quadra. Esse fluxo ainda
  não é gateway Asaas.
- Validação de produção fora do sandbox. A função usa as variáveis do ambiente;
  a produção só está liberada quando `ASAAS_API_URL`, `ASAAS_API_KEY`,
  webhook e token forem confirmados no ambiente de produção.

## Validação executada

- `npm run test:reconciliation`: passou.
- `npm run test:observability`: passou incluindo `asaas-reconcile-billing`.
- `npm run test:billing`: passou em sandbox, incluindo checkout, payment
  vinculado a subscription, webhook simulado e core de reconciliacao.
- `npm run verify`: passou.
- Secret `BILLING_RECONCILIATION_TOKEN`: configurado no Supabase e GitHub
  Actions.
- Secret `SUPABASE_FUNCTIONS_URL`: configurado no GitHub Actions.
- Edge Function `asaas-reconcile-billing`: deployada com `--no-verify-jwt`.
- Dry-run protegido contra a funcao deployada: passou com `ok: true`.

## GO / NO-GO

GO técnico para reconciliação automática do billing de assinatura SaaS.

NO-GO para declarar billing de produção 100% autônomo enquanto não houver:

- validação da chave e URL do Asaas de produção fora do sandbox;
- primeiro pagamento real acompanhado ponta a ponta;
- rotina operacional para investigar workflow falho ou `asaas_webhook_events`
  com `status = failed`.
