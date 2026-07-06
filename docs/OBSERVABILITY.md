# Observabilidade de Produção

Data: 2026-07-05  
Escopo: Supabase Edge Functions do ArenaSys, logs de billing, webhook e assinatura.

## Veredito

GO no escopo de observabilidade das Edge Functions ativas.

As funções ativas passaram a emitir logs JSON estruturados, com identificadores de correlação e sanitização centralizada de secrets, tokens, payloads, dados pessoais e URLs de pagamento.

As funções configuradas em `supabase/config.toml` foram redeployadas no projeto Supabase `extkyeckajhcozjervyr` com `verify_jwt = false`, preservando a autenticação própria já existente de cada endpoint.

## Padrão de log

Todos os logs estruturados passam por `supabase/functions/_shared/observability.ts`.

Campos base:

- `timestamp`
- `level`
- `event`
- `function_name`
- `request_id`
- `correlation_id`
- `trace_id`
- `started_at`
- `duration_ms`

Campos de domínio, quando disponíveis:

- `tenant_id`
- `user_id`
- `subscription_id`
- `payment_id`
- `booking_id`

Headers aceitos:

- `x-request-id`: preservado se enviado; caso contrário é gerado.
- `x-correlation-id`: preservado se enviado; caso contrário usa `request_id`.
- `traceparent`: usa o trace id W3C quando enviado.
- `x-trace-id`: fallback quando `traceparent` não existe.

As respostas JSON das funções instrumentadas também retornam:

- `x-request-id`
- `x-correlation-id`
- `x-trace-id`

## Sanitização

O helper redige campos cujo nome indique:

- authorization;
- access token;
- API key;
- secret;
- password;
- CPF/CNPJ/documento;
- telefone;
- e-mail;
- URLs de invoice/checkout/payment;
- payloads brutos;
- customer;
- request/response body.

Exemplo:

```json
{
  "event": "asaas_api_request_failed",
  "request_id": "req_123",
  "tenant_id": "tenant_123",
  "subscription_id": "sub_123",
  "response_body": "[redacted]"
}
```

## Funções auditadas

### `asaas-webhook`

Eventos registrados:

- `request_started`
- `method_not_allowed`
- `webhook_auth_failed`
- `webhook_secret_missing`
- `webhook_received`
- `webhook_retry_claimed`
- `webhook_duplicate_ignored`
- `webhook_event_ignored`
- `webhook_processing_failed`
- `webhook_processed`
- falhas de persistência em `asaas_webhook_events`
- falhas de lookup/update em `tenant_subscriptions`
- `unexpected_error`

Coberturas específicas:

- webhook duplicado;
- retry de evento previamente marcado como `failed`;
- evento ignorado;
- falta de subscription;
- subscription inexistente;
- falha inesperada;
- `subscription_id`;
- `payment_id`;
- `tenant_id` quando a assinatura é localizada.

O payload bruto do webhook não é mais logado.

### `asaas-create-checkout`

Eventos registrados:

- `request_started`
- `config_loaded`
- `config_missing`
- `config_empty`
- `auth_failed`
- `profile_lookup_failed`
- `tenant_lookup_failed`
- `owner_profile_lookup_failed`
- `tenant_owner_check_failed`
- `checkout_validation_failed`
- `founder_subscriptions_lookup_failed`
- `offer_resolved`
- `asaas_customer_create_started`
- `asaas_customer_created`
- `asaas_customer_reused`
- `asaas_customer_update_started`
- `asaas_customer_update_failed`
- `asaas_subscription_create_started`
- `asaas_subscription_created`
- `subscription_upsert_failed`
- `asaas_payment_lookup_started`
- `asaas_payment_found`
- `checkout_url_missing`
- `checkout_created`
- `unexpected_error`

Removido dos logs:

- listagem de variáveis de ambiente;
- confirmação explícita de presença de chave Asaas;
- dados de cliente;
- CPF/CNPJ;
- telefone;
- e-mail;
- URL final de checkout;
- invoice URL.

### `ensure-tenant-subscription`

Eventos registrados:

- `request_started`
- `config_missing`
- `auth_failed`
- `profile_lookup_failed`
- `profile_missing_tenant`
- `subscription_lookup_failed`
- `subscription_insert_failed`
- `subscription_update_failed`
- `subscription_ensured`
- `unexpected_error`

### `asaas-manage-subscription`

Eventos registrados:

- `request_started`
- `method_not_allowed`
- `auth_failed`
- `profile_lookup_failed`
- `subscription_lookup_failed`
- `subscription_not_found`
- `subscription_missing_provider_id`
- `request_validation_failed`
- `asaas_api_request_started`
- `asaas_api_request_failed`
- `subscription_cancelled`
- `subscription_reactivated`
- `subscription_plan_changed`
- `unexpected_error`

Observação: esta função existe no repositório e foi instrumentada, mas não está listada em `supabase/config.toml` no estado atual.

## Riscos classificados

### Crítico

Nenhum risco crítico restante identificado no escopo de observabilidade das funções ativas.

### Alto

1. Logs antigos imprimiam payload bruto do webhook.
   - Correção: `asaas-webhook` agora registra apenas IDs e tipo do evento.

2. Logs antigos de checkout expunham dados cadastrais e URLs de pagamento.
   - Correção: removidos logs de payload/customer/checkout URL; sanitização centralizada cobre campos sensíveis.

3. Logs antigos indicavam detalhes de configuração de secrets.
   - Correção: logs agora registram apenas `config_missing` ou `config_empty`, sem listar variáveis disponíveis nem valores.

### Médio

1. Falhas de RPC/banco não tinham contexto suficiente.
   - Correção: erros de lookup/update/insert agora incluem `event`, `tenant_id`, `user_id`, `subscription_id` ou `payment_id` quando disponíveis.

2. Eventos duplicados, ignorados e retries eram difíceis de separar.
   - Correção: webhook agora diferencia `webhook_duplicate_ignored`, `webhook_event_ignored` e `webhook_retry_claimed`.

3. Ambiente local não possui `deno` instalado.
   - Mitigação: validação foi feita com testes Node/tsx dos módulos compartilhados, varredura estática, suítes npm, deploy pelo Supabase CLI e probes HTTP contra as funções hospedadas.

4. A versão local do Supabase CLI não expõe `functions logs`.
   - Impacto: a consulta direta de logs pelo terminal não pôde ser validada nesta máquina.
   - Mitigação: os endpoints hospedados foram validados por probe HTTP com headers de correlação; a visualização de logs deve ser feita pelo painel do Supabase ou por CLI atualizado quando necessário.

### Baixo

Nenhum risco baixo restante identificado no escopo.

## Testes

### `npm run test:observability`

Valida:

- formato JSON estruturado;
- `request_id`;
- `correlation_id`;
- `trace_id`;
- `tenant_id`;
- `user_id`;
- `subscription_id`;
- `payment_id`;
- `booking_id`;
- `duration_ms`;
- redaction de token, authorization, e-mail, CPF/CNPJ, telefone e URL;
- ausência de `console.*` direto nos entrypoints ativos.

### `tsx scripts/testAsaasWebhookCore.ts`

Valida:

- webhook duplicado;
- retry de evento falho;
- eventos ignorados;
- status de assinatura;
- metadados retornados para logging.

## Operação

Para investigar um incidente:

1. Comece pelo `request_id` retornado na resposta HTTP.
2. Se vier de cadeia externa, use `correlation_id`.
3. Se houver tracing distribuído, use `trace_id`.
4. Filtre por `tenant_id`.
5. Para billing, filtre por `subscription_id` e `payment_id`.
6. Para webhook, procure `webhook_received` e depois:
   - `webhook_processed`;
   - `webhook_duplicate_ignored`;
   - `webhook_event_ignored`;
   - `webhook_processing_failed`;
   - `unexpected_error`.

## Validação executada

- `npm run test:observability`: passou.
- `tsx scripts/testAsaasWebhookCore.ts`: passou via início de `npm run test:asaas`.
- `npm run test:security`: passou.
- `npm run test:rls`: passou.
- `npm run typecheck`: passou.
- `npm run verify`: passou.
- `npx tsx scripts/verifyAsaasSupabase.ts`: passou.
- Deploy Supabase:
  - `ensure-tenant-subscription`: passou com `--no-verify-jwt`.
  - `asaas-create-checkout`: passou com `--no-verify-jwt`.
  - `asaas-webhook`: passou com `--no-verify-jwt`.
- Probe HTTP de `asaas-create-checkout`: retornou `401` esperado sem autenticação de usuário e preservou `x-request-id`, `x-correlation-id` e `x-trace-id`.
- Probe HTTP de `asaas-webhook`: retornou `401` esperado com token de webhook ausente/inválido e preservou `x-request-id`, `x-correlation-id` e `x-trace-id`.

`npm run test:asaas` parou após o core por falta de `TEST_EMAIL`/`TEST_PASSWORD`, pré-condição já existente do teste de checkout autorizado.

`npx supabase functions logs ...` não está disponível na versão local do Supabase CLI usada nesta máquina; a validação de emissão foi feita por testes automatizados e probes contra as funções deployadas.
